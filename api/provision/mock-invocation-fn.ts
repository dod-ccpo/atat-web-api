import { Logger } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import validator from "@middy/validator";
import { Context } from "aws-lambda";
import axios from "axios";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CspResponse, ProvisionRequest, provisionRequestSchema } from "../../models/provisioning-jobs";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { getToken } from "../../idp/client";
import { secretsClient } from "../../utils/aws-sdk/secrets-manager";

const logger = new Logger({ serviceName: "MockInvocation" });

/**
 * Mock invocation of CSP and returns a CSP Response based on CSP
 * - CspA URI - 200 response
 * - CspB URI - 400 response
 * - CspC or CspD URI - 500 response retries 2 times
 *
 * @param stateInput - Csp Invocation request
 * @return - CspResponse or throw error for 500 or above
 */
export async function baseHandler(
  stateInput: ProvisionRequest,
  context: Context
): Promise<CspResponse | ValidationErrorResponse> {
  logger.addContext(context);
  if (!stateInput) {
    return REQUEST_BODY_INVALID;
  }
  const cspInvocation = stateInput.cspInvocation;
  if (!cspInvocation?.endpoint) {
    return REQUEST_BODY_INVALID;
  }

  const cspResponse = await createCspResponse(stateInput);

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

async function makeARealRequest(request: ProvisionRequest): Promise<CspResponse> {
  const token = (await getToken()).access_token;
  const cspConfig = JSON.parse(
    (await secretsClient.getSecretValue({ SecretId: process.env.CSP_DATA_SECRET! })).SecretString!
  );

  const url = `${cspConfig[request.targetCsp.name].uri}/portfolios`;
  const response = await axios.post(url, request.payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ATAT v0.2.0 client",
    },
  });
  if (response.status !== 200 && response.status !== 202) {
    logger.error("Request to CSP failed", {
      csp: request.targetCsp.name,
      request: {
        csp: request.targetCsp.name,
        url,
      },
      response: { statusCode: response.status, body: response.data },
    });
  }
  return {
    code: response.status,
    content: response.data,
  };
}

export async function createCspResponse(request: ProvisionRequest): Promise<CspResponse> {
  let response: CspResponse;
  switch (request.targetCsp.name) {
    case "CSP_A":
      response = {
        code: 200,
        content: {
          some: "good content",
        },
      };
      logger.info("Success response", { response: response as any });
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
    case "CSP_C":
    case "CSP_D":
      response = {
        code: 500,
        content: {
          some: "internal error",
        },
      };
      console.log("Internal error response : " + JSON.stringify(response));
      return response;
    default:
      response = await makeARealRequest(request);
      logger.info("Mock response", { response: response as any });
      return response;
  }
}

export const handler = middy(baseHandler)
  .use(validator({ inputSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
