import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { ILambdaEvent } from "../../models/provisioning-jobs";

// Create the middleware and export it
export const IpCheckerMiddleware = (): middy.MiddlewareObj<ILambdaEvent, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<ILambdaEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp
    console.log("Client IP address: " + request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
