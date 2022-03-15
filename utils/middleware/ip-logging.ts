import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { StepFunctionRequestEvent, RequestBodyType } from "../../models/provisioning-jobs";

// Create the middleware and export it
export const IpCheckerMiddleware = (): middy.MiddlewareObj<
  StepFunctionRequestEvent<RequestBodyType>,
  APIGatewayProxyResult
> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<StepFunctionRequestEvent<RequestBodyType>, APIGatewayProxyResult> = async (
    request
  ): Promise<void> => {
    // log the sourceIp
    console.log("Client IP address: " + request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
