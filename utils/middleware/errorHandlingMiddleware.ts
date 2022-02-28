import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { serializeError } from "serialize-error";
import { ValidationErrorResponse } from "../response";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT_404,
  NO_SUCH_PORTFOLIO_OR_APPLICATION,
  REQUEST_BODY_INVALID,
} from "../errors";

export const errorHandlingMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const onError: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
    request
  ): Promise<ValidationErrorResponse | void> => {
    const error = serializeError(request.error)!;
    const errorMessage = error?.message as string;

    if (error.name && error.name.startsWith("EntityNotFoundError")) {
      console.log("Invalid parameter entered: " + JSON.stringify(error));
      return NO_SUCH_PORTFOLIO_OR_APPLICATION;
    }
    if (error.errorName === "DuplicateName") {
      return new ValidationErrorResponse("Request failed validation (business rules)", {
        issue: "This name already exists",
        name: error?.duplicateName,
      });
    }
    if (error.errorName === "DuplicatePortfolioName") {
      return new ValidationErrorResponse("Request failed validation (business rules)", {
        issue: "Portfolio name already exists",
        name: error?.applicationName,
      });
    }
    if (error.errorName === "DuplicateApplicationName") {
      return new ValidationErrorResponse("Request failed validation (business rules)", {
        issue: "Application name already exists in this application",
        name: error?.applicationName,
      });
    }

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
      default:
        console.error("Database error: " + JSON.stringify(error));
        return DATABASE_ERROR;
    }
  };
  return {
    onError,
  };
};
