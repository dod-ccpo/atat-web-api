import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "../response";
import { INTERNAL_SERVER_ERROR, REQUEST_BODY_INVALID } from "../errors";
import { StepFunctionRequestEvent, RequestBodyType, CspInvocation, CspResponse } from "../../models/provisioning-jobs";

export const errorHandlingMiddleware = (): middy.MiddlewareObj<
  StepFunctionRequestEvent<RequestBodyType> | CspInvocation,
  APIGatewayProxyResult | CspResponse | ValidationErrorResponse
> => {
  const onError: middy.MiddlewareFn<
    StepFunctionRequestEvent<RequestBodyType> | CspInvocation,
    APIGatewayProxyResult | CspResponse | ValidationErrorResponse
  > = async (request): Promise<ValidationErrorResponse | void> => {
    const error = serializeError(request.error!);
    const errorMessage = error.message;

    if (error.name === "MockCspApiError") {
      throw request.error;
    }

    switch (errorMessage) {
      case "CSP portfolio ID required.":
        return new ValidationErrorResponse("Request failed validation", {
          issue: errorMessage,
          name: error.name,
        });
      case "Event object failed validation":
        return new ValidationErrorResponse("Request failed validation", error.details as Record<string, unknown>);
      case "Business rules validation failed":
        return new ValidationErrorResponse(
          "Request failed validation (business rules)",
          error.error_map as Record<string, unknown>
        );
      case "Shape validation failed, invalid request body":
        return REQUEST_BODY_INVALID;
      case "Content type defined as JSON but an invalid JSON was provided":
        return REQUEST_BODY_INVALID;
      default:
        console.error("Database error: " + JSON.stringify(error));
        return INTERNAL_SERVER_ERROR;
    }
  };
  return {
    onError,
  };
};
