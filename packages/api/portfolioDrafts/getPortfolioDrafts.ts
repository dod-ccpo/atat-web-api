import { ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { portfolioDraftSummaryProperties, PortfolioDraftSummary } from "../models/PortfolioDraftSummary";
import { exhaustivePick } from "../models/TypeFields";
import { dynamodbDocumentClient as client } from "../utils/aws-sdk/dynamodb";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../utils/response";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Sha256 } from "@aws-crypto/sha256-js";
import * as awsCredentials from "@aws-sdk/credential-providers";
import * as stream from "stream";
import { inspect } from "util";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const QUERY_PARAM_INVALID = new OtherErrorResponse("Invalid request parameter", ErrorStatusCode.BAD_REQUEST);

/**
 * Evaluate query string parameter which is expected to be an integer.
 * Return defaultInt if undefined or NaN.
 * @param qparam - The query string parameter to evaluate
 * @param defaultInt - The default value
 */
function evaluateQueryParameterInteger(qparam: string | undefined, defaultInt: number): number {
  // assert numeric
  if (!qparam?.match(/^\d+$/)) {
    return defaultInt;
  }
  return parseInt(qparam);
}

async function queryDynamodb(limit: number): Promise<APIGatewayProxyResult> {
  const params: ScanCommandInput = {
    TableName: TABLE_NAME,
    Limit: limit,
    ProjectionExpression: Object.keys(portfolioDraftSummaryProperties)
      .join(", ")
      .replace("name", "#name")
      .replace("status", "#status"),
    ExpressionAttributeNames: {
      "#name": "name",
      "#status": "status",
    },
  };

  // This is an expensive command and should be replaced when
  // portfolio draft owners and authenticated users are available
  // so that "...to which the user has read access" can be added to the implementation.
  const command = new ScanCommand(params);

  try {
    const data = await client.send(command);
    const items = (data.Items ?? []) as PortfolioDraftSummary[];
    const summaries = items.map((draft) => exhaustivePick(draft, portfolioDraftSummaryProperties));
    return new ApiSuccessResponse<PortfolioDraftSummary[]>(summaries, SuccessStatusCode.OK);
  } catch (error) {
    console.log("Database error (" + error.name + "): " + error);
    return new OtherErrorResponse("Database error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
  }
}

function createSigner(): SignatureV4 {
  return new SignatureV4({
    credentials: awsCredentials.fromEnv(),
    region: process.env.AWS_REGION!,
    service: "es",
    sha256: Sha256,
  });
}

/**
 * Converts the Readable/Stream body of an S3 GetObjectCommandOutput object
 * to a base64-encoded string.
 *
 * Because data from S3 may be binary data, we cannot assume that it will be
 * correct or safe to pass it as a UTF-8 or ASCII string (because images don't
 * encode that way very well, especially though multiple web APIs designed for
 * JSON). This converts it to a base64 string.
 *
 * @param body The Body of the S3 GetObjectCommandOutput
 * @returns The base64-encoded body
 */
export async function responseBodyToString(body: stream.Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    body.on("data", (chunk) => chunks.push(chunk));
    body.on("error", reject);
    body.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function queryOpenSearch(text: string): Promise<APIGatewayProxyResult> {
  const signer = createSigner();
  const client = new NodeHttpHandler();
  const domain = process.env.OPENSEARCH_DOMAIN!;
  const query = {
    multi_match: {
      // Search the name and description fields for the given text
      query: text,
      fields: ["name", "description"],
      operator: "or",
      lenient: true,
    },
  };
  const httpRequest: HttpRequest = new HttpRequest({
    hostname: domain,
    path: "/portfolio-drafts/_search",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      host: domain,
    },
    body: JSON.stringify(query),
  });
  const signedRequest = await signer.sign(httpRequest);
  // @ts-expect-error I dunno -- TODO I guess? 🤷🏻 it's mad about a missing `clone()` method
  const { response } = await client.handle(signedRequest);
  console.log("Request: " + JSON.stringify(httpRequest));
  console.log("Signed Request: " + JSON.stringify(signedRequest));
  console.log("Response: " + inspect(response));
  console.log(response.statusCode + " " + response.body.statusMessage);
  const responseBody = await responseBodyToString(response.body);
  console.log(responseBody);
  return new ApiSuccessResponse<PortfolioDraftSummary>(JSON.parse(responseBody), SuccessStatusCode.OK);
}

/**
 * Gets all Portfolio Drafts, TODO: "...to which the user has read access"
 * Revisit once authentication and authorization are in place.
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Optional query param 'limit' must be integer with minimum value of 1 and maximum value of 50. Defaults to 20.
  // Limit is the number of items to return.
  const limit = evaluateQueryParameterInteger(event.queryStringParameters?.limit, 20);
  const queryText = event.queryStringParameters?.text;
  if (limit < 1 || limit > 50) {
    return QUERY_PARAM_INVALID;
  }
  // If we didn't receive a query, just pull directly from DynamoDB
  if (!queryText) {
    return queryDynamodb(limit);
  }
  return queryOpenSearch(queryText);
}
