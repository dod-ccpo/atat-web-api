import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { UNKNOWN_ERROR } from "./errors";

type Handler = (event: APIGatewayProxyEvent, context?: Context) => Promise<APIGatewayProxyResult>;

/**
 * A wrapper for handlers to ensure that any unhandled errors get returned
 * as a 500 error, rather than resulting in an API Gateway default 502
 * error message.
 *
 * @param handler The underlying handler function
 * @param event The API Gateway event object
 * @param context The Lambda Context object
 * @returns The result from invoking the underlying handler, unless an
 * unhandled error occurs, then a 500 error is logged and returned.
 */
export async function baseHandler(
  handler: Handler,
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> {
  try {
    return handler(event, context);
  } catch (err: unknown) {
    // TODO?: Send data point to CloudWatch Metrics to trigger an alarm? Or
    // see if we can use X-Ray here?
    console.error("An unexpected error occurred on event", err, event);
    if (err instanceof Error) {
      console.error(err.stack);
    } else {
      console.error("Error is not an Error type. Falling back to console.trace");
      console.trace();
    }
    console.error("User will receive a 500 response.");
    return UNKNOWN_ERROR;
  }
}
