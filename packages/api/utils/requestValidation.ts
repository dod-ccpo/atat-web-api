import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "./errors";
import { SetupError, SetupResult, SetupSuccess } from "./response";
import { isValidUuidV4 } from "./validation";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { ApplicationStep } from "../models/ApplicationStep";
import { AccessLevel, Operator } from "../models/Operator";

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

export function findAdministrators(applicationStep: ApplicationStep): AdministratorsFound {
  const { operators, applications } = applicationStep;
  const hasPortfolioAdminRole = adminRoleFound(operators);

  // find apps and envs without admin roles
  const applicationsWithNoAdmin: number[] = [];
  const environmentsWithNoAdmin: EnvironmentWithNoAdminProps[] = [];
  applications.forEach((app, appIndex) => {
    // apps without admin roles
    !adminRoleFound(app.operators) && applicationsWithNoAdmin.push(appIndex);

    // env without admin roles
    app.environments.forEach((env, envIndex) => {
      !adminRoleFound(env.operators) && environmentsWithNoAdmin.push({ appIndex, envIndex });
    });
  });

  // if no missing admin roles in app or env, all app or env admins are considered present
  const hasAdminForEachApplication = applicationsWithNoAdmin.length === 0;
  const hasAdminForEachEnvironment = environmentsWithNoAdmin.length === 0;

  let acceptableAdministratorRoles = hasPortfolioAdminRole || hasAdminForEachApplication || hasAdminForEachEnvironment;

  if (!acceptableAdministratorRoles) {
    let appsWithMissingAppAndEnvAdminRole = 0;
    applicationsWithNoAdmin.forEach((appNoAdmin) => {
      const missingEnvAdmins = environmentsWithNoAdmin.filter((obj) => obj.appIndex === appNoAdmin);
      // if no missing env admin from apps with missing app admin, all env admins considered present
      missingEnvAdmins.length !== 0 && appsWithMissingAppAndEnvAdminRole++;
    });

    acceptableAdministratorRoles = appsWithMissingAppAndEnvAdminRole === 0;
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

export function adminRoleFound(operators: Operator[]): boolean {
  for (const operator of operators) {
    if (operator.access === AccessLevel.PORTFOLIO_ADMINISTRATOR || operator.access === AccessLevel.ADMINISTRATOR) {
      return true;
    }
  }
  return false;
}
