import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Application } from "../../models/Application";
import { ApplicationStep, ValidationMessage } from "../../models/ApplicationStep";
import { Environment } from "../../models/Environment";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
} from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { isApplicationStep, isValidJson, isValidUuidV4 } from "../../utils/validation";
export interface ApplicationValidationError {
  applicationName: string;
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}

/**
 * Submits the Application Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!portfolioDraftId) {
    return PATH_PARAMETER_REQUIRED_BUT_MISSING;
  }
  if (!isValidUuidV4(portfolioDraftId)) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }
  if (!event.body) {
    return REQUEST_BODY_EMPTY;
  }
  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);
  if (!isApplicationStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const applicationStep: ApplicationStep = requestBody;
  const errors: Array<ApplicationValidationError> = validateApplicationStep(applicationStep);
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
        UpdateExpression: "set #portfolioVariable = :application, updated_at = :now",
        ExpressionAttributeNames: {
          "#portfolioVariable": APPLICATION_STEP,
        },
        ExpressionAttributeValues: {
          ":application": applicationStep,
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
  return new ApiSuccessResponse<ApplicationStep>(applicationStep, SuccessStatusCode.CREATED);
}

/**
 * Validates the given ApplicationStep
 * Performs input validation on all Applications and Environments contained therein
 * @param applicationStep the object to validate
 * @returns a collection of application validation errors
 */
export function validateApplicationStep(applicationStep: ApplicationStep): Array<ApplicationValidationError> {
  return applicationStep.applications
    .map(validateApplication)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
}

/**
 * Validates the given Application object
 * @param application the object to validate
 * @returns a collection of application validation errors
 */
export function validateApplication(application: Application): Array<ApplicationValidationError> {
  const errors = Array<ApplicationValidationError>();
  if (application.name.length < 4 || application.name.length > 100) {
    errors.push({
      applicationName: application.name,
      invalidParameterName: "name",
      invalidParameterValue: application.name,
      validationMessage: ValidationMessage.INVALID_APPLICATION_NAME,
    });
  }
  const environmentErrors = application.environments
    .map(validateEnvironment)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);

  return errors.concat(environmentErrors);
}

/**
 * Validates the given Environment object
 * @param environment the object to validate
 * @returns a collection of application validation errors
 */
export function validateEnvironment(environment: Environment): Array<ApplicationValidationError> {
  const errors = Array<ApplicationValidationError>();
  if (environment.name.length < 4 || environment.name.length > 100) {
    errors.push({
      applicationName: environment.name,
      invalidParameterName: "name",
      invalidParameterValue: environment.name,
      validationMessage: ValidationMessage.INVALID_ENVIRONMENT_NAME,
    });
  }
  return errors;
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
