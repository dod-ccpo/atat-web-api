import { ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "./models/Error";
import { PortfolioDraftSummary } from "./models/PortfolioDraftSummary";
import { dynamodbDocumentClient as client } from "./utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "./utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

/**
 * Gets all Portfolio Drafts, TODO: "...to which the user has read access"
 * Revisit once authentication and authorization are in place.
 * @param event - The GET request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Optional query param 'offset' must be integer with minimum value of 0.
  // Offset is the number of items to skip before starting to collect the result set.
  const offset = event.queryStringParameters?.offset;

  // Optional query param 'limit' must be integer with minimum value of 1 and maximum value of 50. Defaults to 20.
  // Limit is the number of items to return.
  const limit = event.queryStringParameters?.limit;
  const defaultLimit = 20;

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
