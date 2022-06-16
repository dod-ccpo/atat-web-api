import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { CommonMiddlewareInputs } from "./common";

// Create the middleware and export it
export const IpCheckerMiddleware = (): middy.MiddlewareObj<CommonMiddlewareInputs, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<CommonMiddlewareInputs, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp
    console.log("Client IP address: " + request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
