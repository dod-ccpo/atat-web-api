import { Context } from "aws-lambda";
import { CspInvocation, cspInvocationSchema, CspResponse } from "../../models/provisioning-jobs";

import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import middy from "@middy/core";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CloudServiceProvider } from "../../models/cloud-service-providers";
import { REQUEST_BODY_INVALID } from "../../utils/errors";

/**
 * Mock invocation of CSP and returns a CSP Response based on CSP
 * - CspA URI - 200 response
 * - CspB URI - 400 response
 * - CspC or CspD URI - 500 response retries 2 times
 *
 * @param stateInput - Csp Invocation request
 * @return - CspResponse or throw error for 500 or above
 */
export async function baseHandler(stateInput: any, context: Context): Promise<any> {
  console.log("STATE INPUT: ", JSON.stringify(stateInput));
  if (!stateInput || !stateInput.endpoint) {
    return REQUEST_BODY_INVALID;
  }

  const cspResponse = createCspResponse(stateInput);

  // Throws a custom error identified by the state machine and the function retires 2 
  // times before failing continuing through the remaining states
  if (cspResponse.code >= 500) {
    const error = new Error(JSON.stringify(cspResponse));
    Object.defineProperty(error, "name", {
      value: "MockCspApiError",
    });
    throw error
  }

  return cspResponse
}

export function createCspResponse(request: CspInvocation): CspResponse {
  const { endpoint } = request;
  let response: CspResponse;
  switch (endpoint.slice(0, 23)) {
    case CloudServiceProvider.CSP_A.uri:
      response = {
        code: 200,
        content: {
          some: "good content",
        },
        request,
      };
      console.log("Success response : " + JSON.stringify(response));
      return response;
    case CloudServiceProvider.CSP_B.uri:
      response = {
        code: 400,
        content: {
          some: "bad content",
        },
        request,
      };
      console.log("Failed response : " + JSON.stringify(response));
      return response;
    default:
      response = {
        code: 500,
        content: {
          some: "internal error",
        },
        request,
      };
      console.log("Internal error response : " + JSON.stringify(response));
      return response;
  }
}

export const handler = middy(baseHandler)
  .use(validator({ inputSchema: cspInvocationSchema }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
