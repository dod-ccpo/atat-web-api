import { APIGatewayProxyEventPathParameters } from "aws-lambda";
import createError from "http-errors";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { SetupSuccess } from "./response";
import { isValidUuidV4 } from "./validation";

/**
 * Check if incoming POST Request passes basic shape validation
 *
 * This shape validation checks the pathParameter to ensure it is not null or undefined, and that is
 * a valid UUIDv4.
 *
 * @param event - The incoming API Gateway Request proxied to Lambda
 * @param extraValidators - Additional validators that check whether the body is a valid object of Type T
 * @returns SetUpSuccess object if event passes validation, otherwise it throws an error
 */
export function validateRequestShape<T>(
  event: ApiGatewayEventParsed<T>,
  ...extraValidators: Array<(obj: unknown) => obj is T>
): SetupSuccess<T> {
  if (!Object.values(event.pathParameters as APIGatewayProxyEventPathParameters).every(isValidUuidV4)) {
    throw createError(404, "Invalid path parameter");
  }
  const requestBody = event.body;
  if (requestBody === undefined) {
    throw createError(400, "Shape validation failed, invalid request body");
  }
  for (const validator of extraValidators) {
    if (!validator(event.body)) {
      throw createError(400, "Shape validation failed, invalid request body");
    }
  }

  return new SetupSuccess<T>({ ...event.pathParameters } as { [key: string]: string }, requestBody as unknown as T);
}
