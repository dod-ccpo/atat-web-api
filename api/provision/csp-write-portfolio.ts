import middy from "@middy/core";
import validator from "@middy/validator";
import { Context } from "aws-lambda";
import axios from "axios";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { getToken } from "../../idp/client";
import { CspResponse, ProvisionRequest, provisionRequestSchema } from "../../models/provisioning-jobs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { getConfiguration } from "./csp-configuration";

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
  logger.info("Event", { event: stateInput as any });
  logger.addPersistentLogAttributes({ correlationIds: { jobId: stateInput.jobId } });

  // TODO: Replace `createCspResponse`'s body with the one from `makeARealRequest` when
  // we no longer need the mock implementations of CSP_<A|B|C|D> and can fully use the
  // mock (or real) integration endpoints.
  const cspResponse = await createCspResponse(stateInput);

  // Throws a custom error identified by the state machine and the function retries 2
  // times before failing continuing through the remaining states
  if (cspResponse.code >= 500) {
    const error = new Error(JSON.stringify(cspResponse));
    Object.defineProperty(error, "name", {
      value: "CspApiError",
    });
    throw error;
  }

  return cspResponse;
}

/**
 * Make a request to an actual CSP implementation of the ATAT API
 *
 * @param request The input provisioning request
 * @returns the response from the CSP
 */
async function makeARealRequest(request: ProvisionRequest): Promise<CspResponse> {
  const baseUrl = (await getConfiguration(request.targetCsp.name))?.uri;
  const url = `${baseUrl}/portfolios`;
  if (!baseUrl || !baseUrl.startsWith("https://")) {
    logger.error("Invalid CSP configuration", {
      input: {
        csp: request.targetCsp.name,
      },
      resolvedUrl: url,
      configSecretPath: process.env.CSP_CONFIG_SECRET_NAME,
    });
    return {
      code: 400,
      content: {
        details: "Invalid CSP provided",
      },
    };
  }

  const response = await axios.post(url, request.payload, {
    headers: {
      Authorization: `Bearer ${(await getToken()).access_token}`,
      "User-Agent": "ATAT v0.2.0 client",
    },
    // Don't throw an error on non-2xx/3xx status code (let us handle it)
    validateStatus() {
      return true;
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
      logger.error("Failed response", { response: response as any });
      return response;
    case "CSP_C":
    case "CSP_D":
      response = {
        code: 500,
        content: {
          some: "internal error",
        },
      };
      logger.error("Internal error response", { response: response as any });
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
