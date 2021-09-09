import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep } from "../../models/FundingStep";
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
} from "../../utils/validation";
import { ErrorCodes } from "../../models/Error";

/**
 * Validation error tuple
 * verror = ["clin_number", "param_name", "param_value", "message"];
 */
export let verror: [string, string, string, string];

/**
 * Accepts a Funding Step and performs input validation
 * on all Clins contained therein.
 * @returns a collection of four-element tuples containing clin number, property names and values that failed input validation, and a specific message
 */
export function validateFundingStepClins(fs: FundingStep): Array<typeof verror> {
  const clins = fs.clins.values();
  let errorAccumulator = Array<typeof verror>();
  for (const clin of clins) {
    const errors = validateClin(clin);
    if (errors.length) {
      errorAccumulator = [...errors, ...errorAccumulator];
    }
  }
  return errorAccumulator;
}

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
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
  const errors: Array<typeof verror> = validateFundingStepClins(fundingStep);
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
        UpdateExpression: "set #stepKey = :step, #updateAtKey = :now",
        ExpressionAttributeNames: {
          // values are JSON keys
          "#stepKey": FUNDING_STEP,
          "#updateAtKey": "updated_at",
        },
        ExpressionAttributeValues: {
          ":step": fundingStep,
          ":now": new Date().toISOString(),
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
  return new ValidationErrorResponse({
    error_map: invalidProperties,
    code: ErrorCodes.INVALID_INPUT,
    message: "Invalid input",
  });
}

/**
 * Validates the given clin object
 * Returns a Clin-centric array of tuples representing validation errors.
 * @param clin an object that looks like a Clin
 * @returns a collection of four-element tuples containing clin number, property names and values that failed input validation, and a specific message
 */
export function validateClin(clin: unknown): Array<typeof verror> {
  if (!isClin(clin)) {
    throw Error("Input must be a Clin object");
  }
  const errors = Array<typeof verror>();
  if (!isValidDate(clin.pop_start_date)) {
    errors.push([clin.clin_number, "pop_start_date", clin.pop_start_date, "start date must be a valid date"]);
  }
  if (!isValidDate(clin.pop_end_date)) {
    errors.push([clin.clin_number, "pop_end_date", clin.pop_end_date, "end date must be a valid date"]);
  }
  if (new Date(clin.pop_start_date) >= new Date(clin.pop_end_date)) {
    errors.push([clin.clin_number, "pop_start_date", clin.pop_start_date, "start date must occur before end date"]);
    errors.push([clin.clin_number, "pop_end_date", clin.pop_end_date, "start date must occur before end date"]);
  }
  if (new Date() >= new Date(clin.pop_end_date)) {
    errors.push([clin.clin_number, "pop_end_date", clin.pop_end_date, "end date must be in the future"]);
  }
  if (clin.total_clin_value <= 0) {
    errors.push([
      clin.clin_number,
      "total_clin_value",
      clin.total_clin_value.toString(),
      "total clin value must be greater than zero",
    ]);
  }
  if (clin.obligated_funds <= 0) {
    errors.push([
      clin.clin_number,
      "obligated_funds",
      clin.obligated_funds.toString(),
      "obligated funds must be greater than zero",
    ]);
  }
  if (clin.obligated_funds > clin.total_clin_value) {
    errors.push([
      clin.clin_number,
      "obligated_funds",
      clin.obligated_funds.toString(),
      "total clin value must be greater than obligated funds",
    ]);
    errors.push([
      clin.clin_number,
      "total_clin_value",
      clin.total_clin_value.toString(),
      "total clin value must be greater than obligated funds",
    ]);
  }
  return errors;
}
