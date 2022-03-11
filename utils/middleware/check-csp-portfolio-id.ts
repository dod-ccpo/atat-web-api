import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ProvisionRequestType } from "../../models/provisioning-jobs";
import createError from "http-errors";

export const cspPortfolioIdChecker = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    const { portfolioId, operationType } = request.event.body as any;

    if (
      (operationType === ProvisionRequestType.ADD_FUNDING_SOURCE ||
        operationType === ProvisionRequestType.ADD_OPERATORS) &&
      !portfolioId
    ) {
      throw createError(400, "CSP portfolio ID required.");
    }
  };

  return {
    before,
  };
};
