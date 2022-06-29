import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "../response";
import { INTERNAL_SERVER_ERROR, REQUEST_BODY_INVALID } from "../errors";
import { CspInvocation, CspResponse, ProvisionRequest } from "../../models/provisioning-jobs";
import { logger } from "../logging";
import { CommonMiddlewareInputs } from "./common";

export type MiddlewareInputs = CommonMiddlewareInputs | CspInvocation | ProvisionRequest;
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
        logger.error("Error occurred during validation", {
          // We have to specifically include the `cause` because it's not included the error's `toJSON`
          // function so that cause details aren't accidentally leaked.
          details: { ...(request.error as any), cause: (request.error as any).cause },
        });
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
        logger.error("Unhandled error", error as Error);
        request.response = INTERNAL_SERVER_ERROR;
        break;
    }
  };
  return {
    onError,
  };
};
