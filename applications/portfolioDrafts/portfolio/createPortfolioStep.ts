import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { PortfolioStep } from "../models/PortfolioStep";
import { dynamodbClient as client } from "../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { isValidJson, isPortfolioStep } from "../utils/validation";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const NO_SUCH_PORTFOLIO = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Request body must not be empty" },
      ErrorStatusCode.BAD_REQUEST
    );
  }

  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO;
  }

  if (!isValidJson(event.body)) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Invalid request body: Invalid JSON" },
      ErrorStatusCode.BAD_REQUEST
    );
  }
  const requestBody = JSON.parse(event.body);

  if (!isPortfolioStep(requestBody)) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Invalid request body: Missing request attributes" },
      ErrorStatusCode.BAD_REQUEST
    );
  }
  const now = new Date().toISOString();
  const portfolioStep: PortfolioStep = requestBody;

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    UpdateExpression: "set #portfolioVariable = :portfolio, updated_at = :now",
    ExpressionAttributeNames: {
      "#portfolioVariable": "portfolio_step",
    },
    ExpressionAttributeValues: {
      ":portfolio": portfolioStep,
      ":now": now,
    },
    ConditionExpression: "attribute_exists(created_at)",
  });

  try {
    await client.send(command);
    return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
  } catch (error) {
    console.log("Database error: " + error.name);
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO;
    }
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error: " + error.name },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
