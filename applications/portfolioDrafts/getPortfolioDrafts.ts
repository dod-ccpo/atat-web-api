import { ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "./models/Error";
import { PortfolioDraftSummary } from "./models/PortfolioDraftSummary";
import { dynamodbDocumentClient as client } from "./utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "./utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const QUERY_PARAM_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Invalid request parameter" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Convert string to integer, return defaultInt if undefined or NaN.
 * @param str - The string value to convert
 * @param defaultInt - The default integer value to return if str undefined or NaN
 */
function getIntegerOrDefault(str: string | undefined, defaultInt: number): number {
  if (str === undefined) return defaultInt;
  const int = parseInt(str);
  if (isNaN(int)) return defaultInt;
  return int;
}

/**
 * Gets all Portfolio Drafts, TODO: "...to which the user has read access"
 * Revisit once authentication and authorization are in place.
 * @param event - The GET request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Optional query param 'offset' must be integer with minimum value of 0.
  // Offset is the number of items to skip before starting to collect the result set.
  const offset: number = getIntegerOrDefault(event.queryStringParameters?.offset, 0);
  console.log("query param 'offset': " + offset);
  if (offset < 0) {
    console.log("INVALID query param 'offset'");
    return QUERY_PARAM_INVALID;
  }

  // Optional query param 'limit' must be integer with minimum value of 1 and maximum value of 50. Defaults to 20.
  // Limit is the number of items to return.
  const limit: number = getIntegerOrDefault(event.queryStringParameters?.limit, 20);
  console.log("query param 'limit': " + limit);
  if (limit < 1 || limit > 50) {
    console.log("INVALID query param 'limit'");
    return QUERY_PARAM_INVALID;
  }

  const params: ScanCommandInput = {
    TableName: TABLE_NAME,
  };

  // This is an expensive command and should be replaced when
  // portfolio draft owners and authenticated users are available
  // so that "...to which the user has read access" can be added to the implementation.
  const command = new ScanCommand(params);

  try {
    const data = await client.send(command);
    return new ApiSuccessResponse<PortfolioDraftSummary[]>(data.Items as PortfolioDraftSummary[], SuccessStatusCode.OK);
  } catch (error) {
    console.log("Database error (" + error.name + "): " + error);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
