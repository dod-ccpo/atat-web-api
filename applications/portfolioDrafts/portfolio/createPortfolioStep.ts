import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { PortfolioStep } from "../models/PortfolioStep";
import { dynamodbClient as client } from "../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { isPortfolioStep, isValidJson } from "../utils/validation";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const NO_SUCH_PORTFOLIO = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);
const REQUEST_BODY_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "A valid PortfolioStep object must be provided" },
  ErrorStatusCode.BAD_REQUEST
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
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);

  if (!isPortfolioStep(requestBody)) {
    return REQUEST_BODY_INVALID;
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
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
};
