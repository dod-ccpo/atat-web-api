import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Operator } from "../../models/Operator";
import { Application } from "../../models/Application";
import { ApplicationStep, ApplicationStepValidationErrors, ValidationMessage } from "../../models/ApplicationStep";
import { Environment } from "../../models/Environment";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
} from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import {
  isApplication,
  isApplicationStep,
  isBodyPresent,
  isEnvironment,
  isOperator,
  isValidJson,
  isValidUuidV4,
} from "../../utils/validation";

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
  if (!isBodyPresent(event.body)) {
    return REQUEST_BODY_EMPTY;
  }
  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);
  if (!isApplicationStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }

  const { applications, operators } = requestBody;
  if (!applications.every(isApplication)) {
    return REQUEST_BODY_INVALID;
  }

  const appEnvs = applications.flatMap((app) => app.environments);
  if (!appEnvs.every(isEnvironment)) {
    return REQUEST_BODY_INVALID;
  }

  const appOperators = applications.flatMap((app) => app.operators);
  const envOperators = appEnvs.flatMap((env) => env.operators);
  const allOperators = [...operators, ...appOperators, ...envOperators];
  if (!allOperators.every(isOperator)) {
    return REQUEST_BODY_INVALID;
  }

  const applicationStep: ApplicationStep = requestBody;
  const errors: Array<ApplicationStepValidationErrors> = performDataValidation(applicationStep);
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
        UpdateExpression: `set #portfolioVariable = :application, updated_at = :now,
        num_applications = :numOfApplications, num_environments = :numOfEnvironments`,
        ExpressionAttributeNames: {
          "#portfolioVariable": APPLICATION_STEP,
        },
        ExpressionAttributeValues: {
          ":application": applicationStep,
          ":now": new Date().toISOString(),
          ":numOfApplications": applicationStep.applications.length,
          ":numOfEnvironments": applicationStep.applications.flatMap((app) => app.environments).length,
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
 * Performs data validation on the given ApplicationStep object
 * Also performs data validation on all Applications and Environments contained therein
 * @param applicationStep the object containing data to validate
 * @returns a collection of application step validation errors
 */
export function performDataValidation(applicationStep: ApplicationStep): Array<ApplicationStepValidationErrors> {
  const operatorErrors: ApplicationStepValidationErrors[] = applicationStep.operators
    .map(performDataValidationOnOperator)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
  const applicationErrors: ApplicationStepValidationErrors[] = applicationStep.applications
    .map(performDataValidationOnApplication)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);

  return operatorErrors.concat(applicationErrors);
}

/**
 * Performs data validation on the given Application object
 * @param application the object containing data to validate
 * @returns a collection of application validation errors
 */
export function performDataValidationOnApplication(application: Application): Array<ApplicationStepValidationErrors> {
  const errors = Array<ApplicationStepValidationErrors>();
  if (application.name.length < 4 || application.name.length > 100) {
    errors.push({
      applicationName: application.name,
      invalidParameterName: "name",
      invalidParameterValue: application.name,
      validationMessage: ValidationMessage.INVALID_APPLICATION_NAME,
    });
  }
  const environmentErrors: ApplicationStepValidationErrors[] = application.environments
    .map(performDataValidationOnEnvironment)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
  const operatorErrors: ApplicationStepValidationErrors[] = application.operators
    .map(performDataValidationOnOperator)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);

  return errors.concat(environmentErrors, operatorErrors);
}

/**
 * Performs data validation on the given Environment object
 * @param environment the object containing data to validate
 * @returns a collection of application validation errors
 */
export function performDataValidationOnEnvironment(environment: Environment): Array<ApplicationStepValidationErrors> {
  const errors = Array<ApplicationStepValidationErrors>();
  if (environment.name.length < 4 || environment.name.length > 100) {
    errors.push({
      environmentName: environment.name,
      invalidParameterName: "name",
      invalidParameterValue: environment.name,
      validationMessage: ValidationMessage.INVALID_ENVIRONMENT_NAME,
    });
  }
  const operatorErrors: ApplicationStepValidationErrors[] = environment.operators
    .map(performDataValidationOnOperator)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
  return errors.concat(operatorErrors);
}

/**
 * Performs data validation on the given Operator object
 * @param operator the object containing data to validate
 * @returns a collection of operator validation errors
 */
export function performDataValidationOnOperator(operator: Operator): Array<ApplicationStepValidationErrors> {
  const errors = Array<ApplicationStepValidationErrors>();
  if (operator.display_name.length < 1 || operator.display_name.length > 100) {
    errors.push({
      operatorDisplayName: operator.display_name,
      invalidParameterName: "display_name",
      invalidParameterValue: operator.display_name,
      validationMessage: ValidationMessage.INVALID_OPERATOR_NAME,
    });
  }
  // Using API Gateway "email" format to enforce the most common email rules
  // and only ensuring the .mil top-level domain here.
  // TODO: possibly add patterns into the internal API spec to help
  const emailRegex = /.mil$/i;
  if (!emailRegex.test(operator.email)) {
    errors.push({
      operatorEmail: operator.email,
      invalidParameterName: "email",
      invalidParameterValue: operator.email,
      validationMessage: ValidationMessage.INVALID_OPERATOR_EMAIL,
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
