import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { ErrorCodes } from "../../models/Error";
import { FundingStep } from "../../models/FundingStep";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
  PATH_VARIABLE_REQUIRED_BUT_MISSING,
} from "../../utils/errors";
import {
  isFundingStep,
  isValidJson,
  isValidDate,
  isPathParameterPresent,
  isClin,
  isValidUuidV4,
} from "../../utils/validation";

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_VARIABLE_REQUIRED_BUT_MISSING;
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
  // const clins = fundingStep.clins.values();
  // for (const clin of clins) {
  //   if (!validateClin(clin)) {
  //     // TODO
  //     console.warn("This clin failed input validation: " + clin.clin_number);
  //     return createValidationErrorResponse({ name: "value" });
  //   }
  // }
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
          "#stepKey": "funding_step",
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
// export function createValidationErrorResponse(invalidProperties: Record<string, unknown>): ValidationErrorResponse {
//   if (Object.keys(invalidProperties).length === 0) {
//     throw Error("Parameter 'invalidProperties' must not be empty");
//   }
//   Object.keys(invalidProperties).forEach((key) => {
//     if (!key) throw Error("Parameter 'invalidProperties' must not have empty string as key");
//   });
//   return new ValidationErrorResponse({
//     errorMap: invalidProperties,
//     code: ErrorCodes.INVALID_INPUT,
//     message: "Invalid input",
//   });
// }

/**
 * Validates the given clin object
 * @param clin an object that looks like a Clin
 * @returns an error map containing property names and values that failed input validation
 */
export function validateClin(clin: unknown): boolean {
  if (!isClin(clin)) {
    throw Error("Input must be a Clin object");
  }
  if (!isValidDate(clin.pop_start_date)) {
    return false;
  }
  if (!isValidDate(clin.pop_end_date)) {
    return false;
  }
  if (new Date(clin.pop_start_date) >= new Date(clin.pop_end_date)) {
    return false;
  }
  if (new Date() >= new Date(clin.pop_end_date)) {
    return false;
  }
  if (clin.total_clin_value <= 0) {
    return false;
  }
  if (clin.obligated_funds <= 0) {
    return false;
  }
  if (clin.obligated_funds >= clin.total_clin_value) {
    return false;
  }
  return true;
}
