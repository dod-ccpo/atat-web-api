import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, DynamoDBException, DatabaseResult } from "../../utils/response";
import { validateRequestShape } from "../../utils/requestValidation";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import cors from "@middy/http-cors";
import xssSanitizer from "../xssSanitizer";
import schema = require("../../models/schema.json");
import { wrapSchema } from "../../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */

export async function baseHandler(
  event: ApiGatewayEventParsed<PortfolioStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<PortfolioStep>(event);
  const portfolioDraftId = event.pathParameters?.portfolioDraftId as string;
  const portfolioStep = event.body;
  // Perform database call
  const databaseResult = await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
  if (databaseResult instanceof DynamoDBException) {
    return databaseResult.errorResponse;
  }
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(
    validator({
      inputSchema: wrapSchema(schema.PortfolioStep),
    })
  )
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors({ headers: "*", methods: "*" }));

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
          ":portfolioDescription": portfolioStep.description ?? "",
          ":numOfManagers": portfolioStep.portfolio_managers.length,
        },
        ConditionExpression: "attribute_exists(created_at)",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return new DynamoDBException(NO_SUCH_PORTFOLIO_DRAFT_404);
    }
    // 5xx error logging
    console.log(error);
    throw error;
  }
}
