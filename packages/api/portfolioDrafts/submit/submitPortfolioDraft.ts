import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../../models/Error";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { isBodyPresent, isPathParameterPresent, isPortfolioStep, isValidJson } from "../../utils/validation";
import { DATABASE_ERROR } from "../../utils/errors";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { v4 as uuidv4 } from "uuid";

const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";
export const NO_SUCH_PORTFOLIO = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);
export const EMPTY_REQUEST_BODY = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Request body must be empty" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Submits all progress from the Portfolio Provisioning Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (isBodyPresent(event.body)) {
    return EMPTY_REQUEST_BODY;
  }

  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!isPathParameterPresent(portfolioDraftId)) {
    return NO_SUCH_PORTFOLIO;
  }

  try {
    const result = await submitPortfolioDraftCommand(TABLE_NAME, portfolioDraftId);

    return new ApiSuccessResponse(result.Attributes as PortfolioDraft, SuccessStatusCode.ACCEPTED);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO;
    }
    console.log("Database error: " + error.name);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error: " + error.name },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
}
export async function submitPortfolioDraftCommand(
  table: string,
  portfolioDraftId: string
): Promise<UpdateCommandOutput> {
  const dynamodb = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(dynamodb);
  const now = new Date().toISOString();
  const submitId = uuidv4();
  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: "set #portfolioVariable = :portfolio, updated_at = :now",
      ExpressionAttributeNames: {
        "#portfolioVariable": "submit_id",
      },
      ExpressionAttributeValues: {
        ":now": now,
        ":portfolio": submitId,
      },
      ConditionExpression: "attribute_exists(created_at)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
}
