import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { PortfolioStep, isPortfolioStep } from "../models/PortfolioStep";
import { dynamodbClient as client } from "../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

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
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "PortfolioDraftId must be specified in the URL path" },
      ErrorStatusCode.BAD_REQUEST
    );
  }

  const requestBody = JSON.parse(event.body);

  if (!isPortfolioStep(requestBody)) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Erra erra this is an erra!" },
      ErrorStatusCode.BAD_REQUEST
    );
  }
  const now = new Date().toISOString();
  const portfolioStep: PortfolioStep = {
    name: requestBody.name,
    description: requestBody.description,
    dod_components: requestBody.dod_components,
    portfolio_managers: requestBody.portfolio_managers,
  };

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    UpdateExpression: "set #portfolioVariable = :x, updated_at = :y",
    ExpressionAttributeNames: {
      "#portfolioVariable": "portfolio_step",
    },
    ExpressionAttributeValues: {
      ":x": portfolioStep,
      ":y": now,
    },
    ConditionExpression: "attribute_exists(created_at)",
    ReturnValues: "ALL_NEW",
  });

  try {
    await client.send(command);
    return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
  } catch (error) {
    console.log("Database error: " + error.name);
    if (error.name === "ConditionalCheckFailedException") {
      return new ErrorResponse(
        { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
        ErrorStatusCode.BAD_REQUEST
      );
    }
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" + error.name },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
