import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SetupError, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep, ValidationMessage } from "../../models/FundingStep";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
} from "../../utils/errors";
import {
  isFundingStep,
  isValidJson,
  isValidDate,
  isPathParameterPresent,
  isClin,
  isValidUuidV4,
  isClinNumber,
  isFundingAmount,
} from "../../utils/validation";
import schema = require("../../models/schema.json");
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { shapeValidationForPostRequest } from "../../utils/requestValidation";
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
/*

export interface ClinValidationError {
  clinNumber: string;
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}
*/
/**
 * Accepts a Funding Step and performs input validation
 * on all Clins contained therein.
 * @returns a collection of clin validation errors
 */
/*
export function validateFundingStepClins(fs: FundingStep): Array<ClinValidationError> {
  return fs.task_orders
    .flatMap((taskOrder) => taskOrder.clins)
    .map(validateClin)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
}
*/
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
// isValidDate




/*
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_PARAMETER_REQUIRED_BUT_MISSING;
  }
  if (!portfolioDraftId || !isValidUuidV4(portfolioDraftId)) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }
  if (!event.body) {
    return REQUEST_BODY_EMPTY;
  }
  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);
  if (!isFundingStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const fundingStep: FundingStep = requestBody;
  const errors: Array<ClinValidationError> = validateFundingStepClins(fundingStep);
  if (errors.length) {
    return createValidationErrorResponse({ input_validation_errors: errors });
  }
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
*/
/**
 * Returns an error response containing 1) an error map containing the specified invalid properties, 2) an error code, 3) a message
 * @param invalidProperties object containing property names and their values which failed validation
 * @returns ValidationErrorResponse containing an error map, error code, and a message
 */

export function createValidationErrorResponse(invalidProperties: Record<string, unknown>): ValidationErrorResponse {
  if (Object.keys(invalidProperties).length === 0) {
    throw Error("Parameter 'invalidProperties' must not be empty");
  }
  Object.keys(invalidProperties).forEach((key) => {
    if (!key) throw Error("Parameter 'invalidProperties' must not have empty string as key");
  });
  return new ValidationErrorResponse("Invalid input", invalidProperties);
} 

/**
 * Validates the given clin object
 * @param clin an object that looks like a Clin
 * @returns a collection of clin validation errors
 */

export function validateClin(clin: unknown): Array<ClinValidationError> {
  if (!isClin(clin)) {
    throw Error("Input must be a Clin object");
  }
  const errors = Array<ClinValidationError>();

  if (!isClinNumber(clin.clin_number)) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "clin_number",
      invalidParameterValue: clin.clin_number,
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
  }
  if (!isValidDate(clin.pop_start_date)) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "pop_start_date",
      invalidParameterValue: clin.pop_start_date,
      validationMessage: ValidationMessage.START_VALID,
    });
  }
  if (!isValidDate(clin.pop_end_date)) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: clin.pop_end_date,
      validationMessage: ValidationMessage.END_VALID,
    });
  }
  if (new Date(clin.pop_start_date) >= new Date(clin.pop_end_date)) {
    const obj = {
      clinNumber: clin.clin_number,
      validationMessage: ValidationMessage.START_BEFORE_END,
    };
    errors.push({
      ...obj,
      invalidParameterName: "pop_start_date",
      invalidParameterValue: clin.pop_start_date,
    });
    errors.push({
      ...obj,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: clin.pop_end_date,
    });
  }
  if (new Date() >= new Date(clin.pop_end_date)) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: clin.pop_end_date,
      validationMessage: ValidationMessage.END_FUTURE,
    });
  }
  if (!isFundingAmount(clin.total_clin_value.toString())) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "total_clin_value",
      invalidParameterValue: clin.total_clin_value.toString(),
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
  }
  if (!isFundingAmount(clin.obligated_funds.toString())) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "obligated_funds",
      invalidParameterValue: clin.obligated_funds.toString(),
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
  }
  if (clin.obligated_funds > clin.total_clin_value) {
    const obj = {
      clinNumber: clin.clin_number,
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
    };
    errors.push({
      ...obj,
      invalidParameterName: "obligated_funds",
      invalidParameterValue: clin.obligated_funds.toString(),
    });
    errors.push({
      ...obj,
      invalidParameterName: "total_clin_value",
      invalidParameterValue: clin.total_clin_value.toString(),
    });
  }
  return errors;
}
*/
