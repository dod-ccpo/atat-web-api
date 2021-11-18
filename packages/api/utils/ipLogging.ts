import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Create the middleware and export it
export const IpCheckerMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp

    // The commented out console.log was for testing and located the problem.
    // If you swap the console.log from being commented out, you can see what I mean
    // The tests pass with just the request.event, but after that the properties are
    // not available for all of the tests using the new IpCheckerMiddleware func
    // Once the request into each of the functions have the proper structure
    // the tests should pass. I did one test on createPortfolioStep.test.ts
    // and added "requestContext: { identity: { sourceIp: "10.2.2.2" } }" to
    // the request
    // console.log("IP TEST: ", request.event);
    console.log(request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
