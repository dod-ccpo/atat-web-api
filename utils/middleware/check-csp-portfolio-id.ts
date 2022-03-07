import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ProvisionRequestType } from "../../models/provisioning";
import createError from "http-errors";

const cspPortfolioIdChecker = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    const { portfolioId, operationType } = request.event.body as any;
    console.log("BEFORE MIDDY: ", request.event.body);
    console.log("BEFORE MIDDY: ", portfolioId, operationType);
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

export default cspPortfolioIdChecker;
