import { provisionRequestSchema, CspResponse, ProvisionRequest } from "../../models/provisioning-jobs";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import middy from "@middy/core";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { ValidationErrorResponse } from "../../utils/response";

/**
 * Mock invocation of CSP and returns a CSP Response based on CSP
 * - CspA URI - 200 response
 * - CspB URI - 400 response
 * - CspC or CspD URI - 500 response retries 2 times
 *
 * @param stateInput - Csp Invocation request
 * @return - CspResponse or throw error for 500 or above
 */
export async function baseHandler(stateInput: ProvisionRequest): Promise<CspResponse | ValidationErrorResponse> {
  console.log("STATE INPUT: ", JSON.stringify(stateInput));
  if (!stateInput) {
    return REQUEST_BODY_INVALID;
  }
  const cspInvocation = stateInput.cspInvocation;
  if (cspInvocation === undefined || !cspInvocation.endpoint) {
    return REQUEST_BODY_INVALID;
  }

  const cspResponse = createCspResponse(stateInput);

  // Throws a custom error identified by the state machine and the function retries 2
  // times before failing continuing through the remaining states
  if (cspResponse.code >= 500) {
    const error = new Error(JSON.stringify(cspResponse));
    Object.defineProperty(error, "name", {
      value: "MockCspApiError",
    });
    throw error;
  }

  return cspResponse;
}

export function createCspResponse(request: ProvisionRequest): CspResponse {
  let response: CspResponse;
  switch (request.targetCsp.name) {
    case "CSP_A":
      response = {
        code: 200,
        content: {
          some: "good content",
        },
      };
      console.log("Success response : " + JSON.stringify(response));
      return response;
    case "CSP_B":
      response = {
        code: 400,
        content: {
          some: "bad content",
        },
      };
      console.log("Failed response : " + JSON.stringify(response));
      return response;
    default:
      response = {
        code: 500,
        content: {
          some: "internal error",
        },
      };
      console.log("Internal error response : " + JSON.stringify(response));
      return response;
  }
}

export const handler = middy(baseHandler)
  .use(validator({ inputSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
