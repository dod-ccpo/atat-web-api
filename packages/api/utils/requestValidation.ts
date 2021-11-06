import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "./errors";
import { SetupError, SetupResult, SetupSuccess } from "./response";
import { isValidUuidV4 } from "./validation";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { ApplicationStep } from "../models/ApplicationStep";
import { Operators, isAdministrator } from "../models/Operator";

/**
 * Check if incoming POST Request passes basic shape validation
 *
 * @param event - The incoming API Gateway Request proxied to Lambda
 * @param extraValidators - Additional validators that check whether the body is a valid object of Type T
 * @returns SetUpSuccess object if event passes validation, otherwise it returns SetUpError
 */
export function shapeValidationForPostRequest<T>(
  event: ApiGatewayEventParsed<T>,
  ...extraValidators: Array<(obj: unknown) => obj is T>
): SetupResult<T> {
  if (!isValidUuidV4(event.pathParameters?.portfolioDraftId)) {
    return new SetupError(NO_SUCH_PORTFOLIO_DRAFT);
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
 * according to the business rules.
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
