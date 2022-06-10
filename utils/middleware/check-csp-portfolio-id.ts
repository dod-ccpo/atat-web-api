import middy from "@middy/core";
import { ProvisionRequestType, ProvisionRequest } from "../../models/provisioning-jobs";
import createError from "http-errors";
import { MiddlewareOutputs } from "./error-handling-middleware";
import { RequestEvent } from "../../models/document-generation";

// Ensures a CSP portfolio id is present when submitting a request
// that updates an already existing portfolio
export const cspPortfolioIdChecker = (): middy.MiddlewareObj<RequestEvent<ProvisionRequest>, MiddlewareOutputs> => {
  const before: middy.MiddlewareFn<RequestEvent<ProvisionRequest>, MiddlewareOutputs> = async (
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
