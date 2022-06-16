import middy from "@middy/core";
import xss from "xss";
import { APIGatewayProxyResult } from "aws-lambda";
import { CommonMiddlewareInputs } from "./common";
// keep plain text only
const xssOptions = {
  allowList: {}, // empty means remove all tags
  stripIgnoreTag: true, // remove all tags not in allow list
  stripIgnoreTagBody: ["script"], // remove script tag content
};

const xssSanitizer = (): middy.MiddlewareObj<CommonMiddlewareInputs, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<CommonMiddlewareInputs, APIGatewayProxyResult> = async (request): Promise<void> => {
    request.event.body = JSON.parse(xss(JSON.stringify(request.event.body ?? {}), xssOptions));
  };
  return {
    before,
  };
};

export default xssSanitizer;
