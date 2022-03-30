import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { StepFunctionRequestEvent, RequestBodyType } from "../../models/provisioning-jobs";

// Create the middleware and export it
type IpCheckerInputs = StepFunctionRequestEvent<RequestBodyType> | APIGatewayProxyEvent;
export const IpCheckerMiddleware = (): middy.MiddlewareObj<IpCheckerInputs, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<IpCheckerInputs, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp
    console.log("Client IP address: " + request.event.requestContext.identity.sourceIp);
  };
  return {
    before,
  };
};
