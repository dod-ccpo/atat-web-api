import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { PortfolioStep } from "../models/PortfolioStep";
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
  // TODO - Implement body validation
  /*
    if (requestBody does not match PortfolioStep or doesn't parse correctly, throw error:
  */

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
    ReturnValues: "ALL_OLD",
  });

  try {
    const data = await client.send(command);

    /*
    if (!data.Attributes) {
      return new ErrorResponse(
        { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
        ErrorStatusCode.NOT_FOUND
      );
    }
    */
    return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
  } catch (err) {
    console.log("Database error: " + err);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
