import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import { PortfolioStep, schema, schemaWrapper } from "../models/PortfolioStep";
import { ApiSuccessResponse, DatabaseResult, DynamoDBException, SuccessStatusCode } from "../utils/response";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../utils/errors";
import { PORTFOLIO_STEP } from "../models/PortfolioDraft";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodbDocumentClient as client } from "../utils/dynamodb";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import httpEventNormalizer from "@middy/http-event-normalizer";

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // the returned response will be checked against the type `APIGatewayProxyResult`
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  // Perform database call
  const databaseResult = await createPortfolioStepCommand(portfolioDraftId!, event.body as unknown as PortfolioStep);
  if (databaseResult instanceof DynamoDBException) {
    return databaseResult.errorResponse;
  }
  return new ApiSuccessResponse<PortfolioStep>(event.body as unknown as PortfolioStep, SuccessStatusCode.CREATED);
}

const handler = middy(baseHandler);

handler
  .use(jsonBodyParser()) // parse the event.body to ensure its valid json
  .use(httpEventNormalizer()) // check the path params, query params, and ensure they are not null
  .use(
    validator({
      inputSchema: schemaWrapper,
    })
  )
  .use(JSONErrorHandlerMiddleware());

export { handler };

export async function createPortfolioStepCommand(
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
): Promise<DatabaseResult> {
  const now = new Date().toISOString();
  try {
    return await client.send(
      new UpdateCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        UpdateExpression: `set #portfolioVariable = :portfolio, updated_at = :now,
          #portfolioName = :portfolioName, #portfolioDescription = :portfolioDescription, num_portfolio_managers = :numOfManagers`,
        ExpressionAttributeNames: {
          "#portfolioVariable": PORTFOLIO_STEP,
          "#portfolioName": "name",
          "#portfolioDescription": "description",
        },
        ExpressionAttributeValues: {
          ":portfolio": portfolioStep,
          ":now": now,
          ":portfolioName": portfolioStep.name,
          ":portfolioDescription": portfolioStep.description,
          ":numOfManagers": portfolioStep.portfolio_managers.length,
        },
        ConditionExpression: "attribute_exists(created_at)",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return new DynamoDBException(NO_SUCH_PORTFOLIO_DRAFT);
    }
    // 5xx error logging
    console.log(error);
    throw error;
  }
}
