import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CloudServiceProvider } from "../models/CloudServiceProvider";

function isRequestBodyEmptyString(body: string | null): boolean {
  return body?.length === 0;
}

function emptyPortfolioBody() {
  // improve the default values when possible
  const emptyPortfolio = {
    name: `New Portfolio ${new Date().valueOf()}`,
    // replace with logged in user
    owner: "portfolio.creator@example.mil",
    // need a better default
    csp: CloudServiceProvider.CSP_A,
    dodComponents: [],
    portfolioManagers: [],
  };
  return JSON.parse(JSON.stringify(emptyPortfolio));
}

/**
 * Middleware helper for createPortfolio operation
 * API spec allows empty Portfolio to be created when empty string request body is recieved.
 * This handles that case.  When request body is an empty or populated JSON object that is handled elsewhere.
 * @returns
 */
export const EmptyPortfolioMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    if (isRequestBodyEmptyString(request.event.body)) {
      console.debug("EmptyPortfolioMiddleware before(): request body is empty string, creating empty portfolio");
      request.event.body = emptyPortfolioBody();
    }
  };
  return {
    before,
  };
};
