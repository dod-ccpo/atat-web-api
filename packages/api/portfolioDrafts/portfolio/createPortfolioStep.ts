import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import {
  ApiSuccessResponse,
  SuccessStatusCode,
  SetupError,
  DynamoDBException,
  DatabaseResult,
} from "../../utils/response";
import { shapeValidationForPostRequest } from "../../utils/requestValidation";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import cors from "@middy/http-cors";
import xssSanitizer from "../xssSanitizer";
import schema = require("../../models/schema.json");

const portfolioStepSchema = {
  type: "object",
  required: ["body"],
  properties: {
    body: schema.PortfolioStep,
  },
};
/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */

export async function baseHandler(
  event: ApiGatewayEventParsed<PortfolioStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  // Perform shape validation
  const setupResult = shapeValidationForPostRequest<PortfolioStep>(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;
  const portfolioStep = event.body;
  // Perform database call
  const databaseResult = await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
  if (databaseResult instanceof DynamoDBException) {
    return databaseResult.errorResponse;
  }
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
}

const handler = middy(baseHandler);
handler
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(
    validator({
      inputSchema: portfolioStepSchema,
    })
  )
  .use(JSONErrorHandlerMiddleware())
  .use(cors({ headers: "*", methods: "*" }));

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
          ":portfolioDescription": portfolioStep.description ?? "",
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
