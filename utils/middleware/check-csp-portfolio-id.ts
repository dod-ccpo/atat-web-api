import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import {
  StepFunctionRequestEvent,
  ProvisionRequestType,
  RequestBodyType,
  CspResponse,
} from "../../models/provisioning-jobs";
import createError from "http-errors";
import { ValidationErrorResponse } from "../response";

export const cspPortfolioIdChecker = (): middy.MiddlewareObj<
  StepFunctionRequestEvent<RequestBodyType>,
  APIGatewayProxyResult | CspResponse | ValidationErrorResponse
> => {
  const before: middy.MiddlewareFn<
    StepFunctionRequestEvent<RequestBodyType>,
    APIGatewayProxyResult | CspResponse | ValidationErrorResponse
  > = async (request): Promise<void> => {
    const { portfolioId, operationType } = request.event.body;
    const requiresPortfolioId = [ProvisionRequestType.ADD_FUNDING_SOURCE, ProvisionRequestType.ADD_OPERATORS];
    if (requiresPortfolioId.includes(operationType) && !portfolioId) {
      throw createError(400, "CSP portfolio ID required.");
    }
  };

  return {
    before,
  };
};
