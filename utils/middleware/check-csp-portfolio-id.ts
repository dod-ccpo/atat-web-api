import middy from "@middy/core";
import createError from "http-errors";
import { MiddlewareOutputs } from "./error-handling-middleware";
import { RequestEvent } from "../../models/document-generation";
import { HothProvisionRequest, ProvisionRequestType } from "../../api/client";

// Ensures a CSP portfolio id is present when submitting a request
// that updates an already existing portfolio
export const cspPortfolioIdChecker = (): middy.MiddlewareObj<RequestEvent<HothProvisionRequest>, MiddlewareOutputs> => {
  const before: middy.MiddlewareFn<RequestEvent<HothProvisionRequest>, MiddlewareOutputs> = async (
    request
  ): Promise<void> => {
    const { portfolioId, operationType } = request.event.body;
    const requiresPortfolioId = [ProvisionRequestType.ADD_TASK_ORDER, ProvisionRequestType.ADD_ADMINISTRATOR];
    if (requiresPortfolioId.includes(operationType) && !portfolioId) {
      throw createError(400, "CSP portfolio ID required.");
    }
  };

  return {
    before,
  };
};
