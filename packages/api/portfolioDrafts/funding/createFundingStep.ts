import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SetupError, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep, ValidationMessage } from "../../models/FundingStep";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import schema = require("../../models/schema.json");
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import {
  ClinValidationError,
  createValidationErrorResponse,
  shapeValidationForPostRequest,
  validateFundingStepClins,
} from "../../utils/requestValidation";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import xssSanitizer from "../xssSanitizer";

const validatedSchema = schema.FundingStep;
const schemaWrapper = {
  type: "object",
  required: ["body"],
  properties: {
    body: validatedSchema,
  },
};
/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<FundingStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  // Perform shape validation
  const setupResult = shapeValidationForPostRequest<FundingStep>(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;
  const fundingStep = event.body;
  // Perform business rules validation
  validateFundingStepClins(fundingStep);

  // const validatedFundingStep = validateFundingStepClins(fundingStep);

  /*
  const errors: Array<ClinValidationError> = validateFundingStepClins(fundingStep);
  if (errors.length) {
    return createValidationErrorResponse({ input_validation_errors: errors });
  } */
  // console.log(validatedFundingStep);
  // Perform database call
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
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<FundingStep>(fundingStep, SuccessStatusCode.CREATED);
}
const handler = middy(baseHandler);
handler
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(
    validator({
      inputSchema: schemaWrapper,
      ajvOptions: { strict: false },
    })
  )
  .use(JSONErrorHandlerMiddleware())
  .use(cors({ headers: "*", methods: "*" }));

export { handler };
