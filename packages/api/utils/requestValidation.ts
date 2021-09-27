import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID, REQUEST_BODY_EMPTY } from "./errors";
import { APIGatewayProxyEvent } from "aws-lambda";
import { SetupError, SetupResult, SetupSuccess } from "./response";
import { isBodyPresent, isValidJson, isValidUuidV4 } from "./validation";

/**
 * Check if incoming POST Request passes basic shape validation
 *
 * @param event - The incoming API Gateway Request proxied to Lambda
 * @returns SetUpSuccess object if event passes validation, otherwise it returns SetUpError
 */
export function postRequestPreValidation<T>(event: APIGatewayProxyEvent): SetupResult<T> {
  if (!isValidUuidV4(event.pathParameters?.portfolioDraftId)) {
    return new SetupError(NO_SUCH_PORTFOLIO_DRAFT);
  }
  if (!isBodyPresent(event.body)) {
    return new SetupError(REQUEST_BODY_EMPTY);
  }
  const portfolioDraftId = event.pathParameters!.portfolioDraftId!;
  const bodyResult = isValidJson<T>(event.body);
  if (bodyResult === undefined) {
    return new SetupError(REQUEST_BODY_INVALID);
  }
  return new SetupSuccess<T>({ portfolioDraftId }, bodyResult);
}
