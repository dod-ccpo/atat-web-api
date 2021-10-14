import middy from "@middy/core";
import xss from "xss";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const xssSanitizer = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    request.event.body = xss(request.event.body ?? "");
  };
  return {
    before,
  };
};

export default xssSanitizer;
