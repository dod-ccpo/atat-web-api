import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Create the middleware and export it
export const IpCheckerMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp
    console.log(request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
