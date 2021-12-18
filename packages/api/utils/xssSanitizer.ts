import middy from "@middy/core";
import xss from "xss";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// keep plain text only
const xssOptions = {
  whiteList: {}, // empty means remove all tags
  stripIgnoreTag: true, // remove all tags not in whitelist
  stripIgnoreTagBody: ["script"], // remove script tag content
};
const xssSanitizer = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request): Promise<void> => {
    request.event.body = JSON.parse(xss(JSON.stringify(request.event.body ?? {}), xssOptions));
  };
  return {
    before,
  };
};

export default xssSanitizer;
