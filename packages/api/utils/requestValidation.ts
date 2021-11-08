import { SetupError, SetupResult, SetupSuccess, ValidationErrorResponse } from "./response";
import { isValidUuidV4, isValidDate, isClin, isClinNumber, isFundingAmount } from "./validation";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { FundingStep, ValidationMessage } from "../models/FundingStep";
import { Clin } from "../models/Clin";
import createError from "http-errors";
import { NO_SUCH_PORTFOLIO_DRAFT_404, REQUEST_BODY_INVALID } from "./errors";
import { ApplicationStep } from "../models/ApplicationStep";
import { Operators, isAdministrator } from "../models/Operator";

/**
 * Check if incoming POST Request passes basic shape validation
 *
 * @param event - The incoming API Gateway Request proxied to Lambda
 * @param extraValidators - Additional validators that check whether the body is a valid object of Type T
 * @returns SetUpSuccess object if event passes validation, otherwise it returns SetUpError
 */
export function requestShapeValidation<T>(
  event: ApiGatewayEventParsed<T>,
  ...extraValidators: Array<(obj: unknown) => obj is T>
): SetupResult<T> {
  if (!isValidUuidV4(event.pathParameters?.portfolioDraftId)) {
    return new SetupError(NO_SUCH_PORTFOLIO_DRAFT_404);
  }
  const portfolioDraftId = event.pathParameters!.portfolioDraftId!;
  const bodyResult = event.body;
  if (bodyResult === undefined) {
    return new SetupError(REQUEST_BODY_INVALID);
  }
  for (const validator of extraValidators) {
    if (!validator(event.body)) {
      return new SetupError(REQUEST_BODY_INVALID);
    }
  }

  return new SetupSuccess<T>({ portfolioDraftId }, bodyResult as unknown as T);
}
export interface ClinValidationError {
  clinNumber: string;
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}

/**
 * Check if the given Funding Step object passed business rule validation
 *
 * @param fs - the FundingStep object that has passed schema validation
 * @returns an ValidationErrorResponse (by throwing an error to the middleware) if there are Clin validation errors
 */

export function validateBusinessRulesForFundingStep(fs: FundingStep): ValidationErrorResponse | undefined {
  const errors: Array<ClinValidationError> = validateFundingStepClins(fs);
  if (errors.length) {
    return createBusinessRulesValidationErrorResponse({ input_validation_errors: errors });
  }
  return undefined;
}

export function validateFundingStepClins(fs: FundingStep): Array<ClinValidationError> {
  return fs.task_orders
    .flatMap((taskOrder) => taskOrder.clins)
    .map(validateClin)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
}
/**
 * Validates the given clin object
 * @param clin an object that looks like a Clin
 * @returns a collection of clin validation errors
 */

export function validateClin(clin: Clin): Array<ClinValidationError> {
  const errors = Array<ClinValidationError>();
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

export function createBusinessRulesValidationErrorResponse(
  invalidProperties: Record<string, unknown>
): ValidationErrorResponse {
  if (Object.keys(invalidProperties).length === 0) {
    throw Error("Parameter 'invalidProperties' must not be empty");
  }
  Object.keys(invalidProperties).forEach((key) => {
    if (!key) throw Error("Parameter 'invalidProperties' must not have empty string as key");
  });
  throw createError(400, "Business rules validation failed", { details: invalidProperties });
}

interface EnvironmentWithNoAdminProps {
  appIndex: number;
  envIndex: number;
}
interface AdministratorsFound {
  hasPortfolioAdminRole: boolean;
  hasAdminForEachApplication: boolean;
  hasAdminForEachEnvironment: boolean;
  applicationsWithNoAdmin: number[];
  environmentsWithNoAdmin: EnvironmentWithNoAdminProps[];
  acceptableAdministratorRoles: boolean;
}

/**
 * Find and determine if an application step has the correct business rules for
 * operator admin roles.
 *
 * Acceptable admin roles according to the business rules, only one of the following is required:
 * - 1 root portfolio admin role
 * - 1 application admin role for each application (without a portfolio admin role above)
 * - 1 environment admin role for each environment (without a portfolio or application admin role above)
 *
 * @param applicationStep - the incoming applicationStep request body
 * @returns - an object summarizing the admin roles found or missing
 */
export function findAdministrators(applicationStep: ApplicationStep): AdministratorsFound {
  const { operators, applications } = applicationStep;
  const hasPortfolioAdminRole = adminRoleFound(operators);

  // find apps and envs without admin roles
  const environmentsWithNoAdmin: EnvironmentWithNoAdminProps[] = [];
  const applicationsWithNoAdmin = applications
    .map((app, appIndex) => {
      // check each app for missing env admin roles
      app.environments
        .map((env, envIndex) => ({ env, envIndex }))
        .filter(({ env }) => !adminRoleFound(env.operators))
        .forEach(({ envIndex }) => environmentsWithNoAdmin.push({ appIndex, envIndex }));

      return { app, appIndex };
    })
    .filter(({ app }) => !adminRoleFound(app.operators))
    .map(({ appIndex }) => appIndex);

  // if no missing admin roles in app or env, all app or env admins are considered present
  const hasAdminForEachApplication = applicationsWithNoAdmin.length === 0;
  const hasAdminForEachEnvironment = environmentsWithNoAdmin.length === 0;

  let acceptableAdministratorRoles = hasPortfolioAdminRole || hasAdminForEachApplication || hasAdminForEachEnvironment;

  if (!acceptableAdministratorRoles) {
    const appsWithMissingAppAndEnvAdminRole = environmentsWithNoAdmin.filter(({ appIndex }) =>
      applicationsWithNoAdmin.includes(appIndex)
    );

    acceptableAdministratorRoles = appsWithMissingAppAndEnvAdminRole.length === 0;
  }

  return {
    hasPortfolioAdminRole,
    hasAdminForEachApplication,
    hasAdminForEachEnvironment,
    applicationsWithNoAdmin,
    environmentsWithNoAdmin,
    acceptableAdministratorRoles,
  };
}

/**
 * Checks if at least one operator admin is present in a group of operators
 * according to the business rules which require an admin at an environment
 * level or a higher in the Portfolio Draft.
 *
 * Only 'portfolio_administrator' operators are found at the top level, and
 * 'administrator' operators are found at the app and env levels.
 *
 * @param operators - operators at one of the three application step levels
 * @returns - true if one operator admin found, and false otherwise
 */
export function adminRoleFound(operators: Operators[]): boolean {
  return operators.some(isAdministrator);
}
