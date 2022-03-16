import middy from "@middy/core";
import { StepFunctionRequestEvent, ProvisionRequestType, RequestBodyType } from "../../models/provisioning-jobs";
import createError from "http-errors";
import { MiddlewareOutputs } from "./error-handling-middleware";

export const cspPortfolioIdChecker = (): middy.MiddlewareObj<
  StepFunctionRequestEvent<RequestBodyType>,
  MiddlewareOutputs
> => {
  const before: middy.MiddlewareFn<StepFunctionRequestEvent<RequestBodyType>, MiddlewareOutputs> = async (
    request
  ): Promise<void> => {
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
