import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "./response";
import { NO_SUCH_PORTFOLIO_DRAFT_404, REQUEST_BODY_INVALID } from "./errors";

export const errorHandlingMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const onError: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
    request
  ): Promise<ValidationErrorResponse | void> => {
    const error = serializeError(request.error)!;
    const errorMessage = error?.message as string;
    switch (errorMessage) {
      case "Event object failed validation":
        return new ValidationErrorResponse("Request failed validation", error.details as Record<string, unknown>);
      case "Business rules validation failed":
        return new ValidationErrorResponse(
          "Request failed validation (business rules)",
          error.error_map as Record<string, unknown>
        );
      case "Shape validation failed, invalid UUIDv4":
        return NO_SUCH_PORTFOLIO_DRAFT_404;
      case "Shape validation failed, invalid request body":
        return REQUEST_BODY_INVALID;
      case "Content type defined as JSON but an invalid JSON was provided":
        return REQUEST_BODY_INVALID;
    }
  };
  return {
    onError,
  };
};
