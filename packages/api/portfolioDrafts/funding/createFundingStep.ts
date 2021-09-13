import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
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

export interface ClinValidationError {
  clinNumber: string;
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}

/**
 * Accepts a Funding Step and performs input validation
 * on all Clins contained therein.
 * @returns a collection of clin validation errors
 */
export function validateFundingStepClins(fs: FundingStep): Array<ClinValidationError> {
  return fs.clins.map(validateClin).reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
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
