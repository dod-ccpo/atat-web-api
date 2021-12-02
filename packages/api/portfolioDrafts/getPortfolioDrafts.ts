import { ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { portfolioDraftSummaryProperties, PortfolioDraftSummaryModel } from "../models/PortfolioDraftSummary";
import { exhaustivePick } from "../models/TypeFields";
import { dynamodbDocumentClient as client } from "../utils/aws-sdk/dynamodb";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../utils/response";

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

/**
 * Gets all Portfolio Drafts, TODO: "...to which the user has read access"
 * Revisit once authentication and authorization are in place.
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Optional query param 'limit' must be integer with minimum value of 1 and maximum value of 50. Defaults to 20.
  // Limit is the number of items to return.
  const limit = evaluateQueryParameterInteger(event.queryStringParameters?.limit, 20);
  if (limit < 1 || limit > 50) {
    return QUERY_PARAM_INVALID;
  }

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
    const items = (data.Items ?? []) as PortfolioDraftSummaryModel[];
    const summaries = items.map((draft) => exhaustivePick(draft, portfolioDraftSummaryProperties));
    return new ApiSuccessResponse<PortfolioDraftSummaryModel[]>(summaries, SuccessStatusCode.OK);
  } catch (error) {
    console.log("Database error (" + error.name + "): " + error);
    return new OtherErrorResponse("Database error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
  }
}
