import middy from "@middy/core";
import xss from "xss";
import { APIGatewayProxyResult } from "aws-lambda";
import { StepFunctionRequestEvent, RequestBodyType } from "../../models/provisioning-jobs";

// keep plain text only
const xssOptions = {
  allowList: {}, // empty means remove all tags
  stripIgnoreTag: true, // remove all tags not in allow list
  stripIgnoreTagBody: ["script"], // remove script tag content
};
const xssSanitizer = (): middy.MiddlewareObj<StepFunctionRequestEvent<RequestBodyType>, APIGatewayProxyResult> => {
  const before: middy.MiddlewareFn<StepFunctionRequestEvent<RequestBodyType>, APIGatewayProxyResult> = async (
    request
  ): Promise<void> => {
    request.event.body = JSON.parse(xss(JSON.stringify(request.event.body ?? {}), xssOptions));
  };
  return {
    before,
  };
};

export default xssSanitizer;
