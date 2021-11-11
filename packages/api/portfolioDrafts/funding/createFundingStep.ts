import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep } from "../../models/FundingStep";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import schema = require("../../models/schema.json");
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape, validateBusinessRulesForFundingStep } from "../../utils/requestValidation";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import xssSanitizer from "../xssSanitizer";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { wrapSchema } from "../../utils/schemaWrapper";
import { IpCheckerMiddleware } from "../../utils/ipLogging";

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<FundingStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<FundingStep>(event);
  const portfolioDraftId = event.pathParameters?.portfolioDraftId as string;
  const fundingStep = event.body;
  validateBusinessRulesForFundingStep(fundingStep);
  try {
    await client.send(
      new UpdateCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        UpdateExpression: "set #stepKey = :step, #updateAtKey = :now, num_task_orders = :numOfTaskOrders",
        ExpressionAttributeNames: {
          // values are JSON keys
          "#stepKey": FUNDING_STEP,
          "#updateAtKey": "updated_at",
        },
        ExpressionAttributeValues: {
          ":step": fundingStep,
          ":now": new Date().toISOString(),
          ":numOfTaskOrders": fundingStep.task_orders.length,
        },
        ConditionExpression: "attribute_exists(created_at)",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<FundingStep>(fundingStep, SuccessStatusCode.CREATED);
}
export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(schema.FundingStep) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
