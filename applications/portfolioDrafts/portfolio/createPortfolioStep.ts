import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PortfolioStep } from "../models/PortfolioStep";
import { dynamodbClient as client } from "../utils/dynamodb";
import { PortfolioStepResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { ErrorCodes } from "../models/Error";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const InvalidBody = { code: "INVALID_INPUT", message: "HTTP request body must not be empty" };
const DatabaseError = { code: "OTHER", message: "Internal database error" };

/**
 * Handles requests from the API Gateway.
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

  const portfolioId = event.pathParameters?.portfolioDraftId;

  const requestBody = JSON.parse(event.body);
  const portfolioStep: PortfolioStep = {
    name: requestBody.name,
    description: requestBody.description,
    dod_components: requestBody.dod_components,
    portfolio_managers: requestBody.portfolio_managers,
  };

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioId,
    },
    UpdateExpression: "set #portfolioVariable = :x",
    ExpressionAttributeNames: {
      "#portfolioVariable": "portfolio_step",
    },
    ExpressionAttributeValues: {
      ":x": portfolioStep,
    },
  });

  try {
    await client.send(command);
  } catch (err) {
    console.log("Database error: " + err);
    // return { statusCode: 500, body: JSON.stringify(DatabaseError) };
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
  // return { statusCode: 201, body: JSON.stringify(pf) };
  return new PortfolioStepResponse(portfolioStep, SuccessStatusCode.CREATED);
};
