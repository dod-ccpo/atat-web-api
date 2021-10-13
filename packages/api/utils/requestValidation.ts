import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "./errors";
import { SetupError, SetupResult, SetupSuccess } from "./response";
import { isValidUuidV4 } from "./validation";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
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
