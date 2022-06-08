import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import { ProvisionRequest } from "../../models/provisioning-jobs";

// Create the middleware and export it
export type CommonMiddlewareInputs =
  | RequestEvent<ProvisionRequest>
  | APIGatewayProxyEvent
  | RequestEvent<GenerateDocumentRequest>;
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
