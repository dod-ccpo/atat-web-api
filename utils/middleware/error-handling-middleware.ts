import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "../response";
import { INTERNAL_SERVER_ERROR, REQUEST_BODY_INVALID } from "../errors";
import {
  StepFunctionRequestEvent,
  RequestBodyType,
  CspInvocation,
  CspResponse,
  ProvisionRequest,
} from "../../models/provisioning-jobs";

export type MiddlewareInputs =
  | StepFunctionRequestEvent<RequestBodyType>
  | CspInvocation
  | ProvisionRequest
  | APIGatewayProxyEvent;
export type MiddlewareOutputs = APIGatewayProxyResult | CspResponse | ValidationErrorResponse | ProvisionRequest;

// A central place to catch and handle errors that occur before,
// during, and after the execution of the lambda
export const errorHandlingMiddleware = (): middy.MiddlewareObj<MiddlewareInputs, MiddlewareOutputs> => {
  const onError: middy.MiddlewareFn<MiddlewareInputs, MiddlewareOutputs> = async (
    request
  ): Promise<ValidationErrorResponse | void> => {
    const error = serializeError(request.error!);
    const errorMessage = error.message;

    if (error.name === "CspApiError") {
      // force state machine task to retry
      throw request.error;
    }

    switch (errorMessage) {
      case "CSP portfolio ID required.":
        request.response = new ValidationErrorResponse("Request failed validation", {
          issue: errorMessage,
          name: error.name,
        });
        break;
      case "Event object failed validation":
        request.response = new ValidationErrorResponse(
          "Request failed validation",
          error.details as Record<string, unknown>
        );
        break;
      case "Business rules validation failed":
        request.response = new ValidationErrorResponse(
          "Request failed validation (business rules)",
          error.error_map as Record<string, unknown>
        );
        break;
      case "Shape validation failed, invalid request body":
        request.response = REQUEST_BODY_INVALID;
        break;
      case "Content type defined as JSON but an invalid JSON was provided":
        request.response = REQUEST_BODY_INVALID;
        break;
      default:
        console.error("Unhandled error: " + JSON.stringify(error));
        request.response = INTERNAL_SERVER_ERROR;
        break;
    }
  };
  return {
    onError,
  };
};
