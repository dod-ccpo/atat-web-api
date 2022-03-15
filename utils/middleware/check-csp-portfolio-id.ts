import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { ILambdaEvent, ProvisionRequestType } from "../../models/provisioning-jobs";
import createError from "http-errors";

export const cspPortfolioIdChecker = (): middy.MiddlewareObj<ILambdaEvent, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<ILambdaEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
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
