import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "./response";
import { REQUEST_BODY_INVALID } from "./errors";

const errorHandlingMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const onError: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
    request
  ): Promise<ValidationErrorResponse | void> => {
    const error = serializeError(request.error)!;
    // Catch middy validation error, wrap it in ValidationErrorResponse
    if (error.message === "Event object failed validation") {
      return new ValidationErrorResponse("Request failed validation", error.details as Record<string, unknown>);
    }
    if (error.message === "Business rules validation failed") {
      const errorMap = error.details as Record<string, unknown>;
      const businessRules = errorMap.input_validation_errors;
      // should we keep this inside of input_validation_errors?
      return new ValidationErrorResponse(
        "Request failed validation (business rules)",
        businessRules as Record<string, unknown>
      );
    }
    if (error.name === "UnprocessableEntityError") {
      return REQUEST_BODY_INVALID;
    }
  };
  return {
    onError,
  };
};

export default errorHandlingMiddleware;
