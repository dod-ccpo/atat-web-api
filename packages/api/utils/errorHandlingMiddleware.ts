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
    // const errorMap = error?.details as Record<string, unknown>;
    // const businessRules = errorMap.input_validation_errors;
    switch (errorMessage) {
      case "Event object failed validation":
        return new ValidationErrorResponse("Request failed validation", error.details as Record<string, unknown>);
      case "Business rules validation failed":
        // const errorMap = error.details as Record<string, unknown>;
        // const businessRules = errorMap.input_validation_errors;
        // should we keep this inside of input_validation_errors?
        return new ValidationErrorResponse(
          "Request failed validation (business rules)",
          error.error_map as Record<string, unknown>
        );
      case "Shape validation failed, invalid UUIDv4":
        return NO_SUCH_PORTFOLIO_DRAFT_404;
      default:
        console.log(error.message);
    }

    // AT-6734 catch setup error
    // AT-6734 catch DB error
    // Catch middy validation error, wrap it in ValidationErrorResponse
    /*
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
    if (error.message === "Shape validation failed, invalid UUIDv4") {
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
    if (
      error.message === "Shape validation failed, invalid request body" ||
      error.name === "UnprocessableEntityError"
    ) {
      return REQUEST_BODY_INVALID;
    }
    */
    /*
    if (error.name === "UnprocessableEntityError") {
      return REQUEST_BODY_INVALID;
    } */
  };
  return {
    onError,
  };
};
