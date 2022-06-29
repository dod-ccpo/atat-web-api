import middy from "@middy/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { CommonMiddlewareInputs } from "./common";
import { logger } from "../logging";

// Create the middleware and export it
export const LoggingContextMiddleware = (): middy.MiddlewareObj<CommonMiddlewareInputs, APIGatewayProxyResult> => {
  // Set up a before check, this will run before the handler
  const before: middy.MiddlewareFn<CommonMiddlewareInputs, APIGatewayProxyResult> = async (request): Promise<void> => {
    // log the sourceIp
    logger.setPersistentLogAttributes({
      userIdentity: {
        ipAddress: request.event.requestContext.identity.sourceIp,
        user: request.event.requestContext.identity.userArn,
        accessKey: request.event.requestContext.identity.accessKey,
      },
    });
  };
  return {
    before,
  };
};
