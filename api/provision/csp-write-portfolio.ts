import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { Context } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CspRequest } from "../../models/cost-jobs";
import { ProvisionRequest, provisionRequestSchema } from "../../models/provisioning-jobs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { cspRequest, CspResponse } from "../util/csp-request";

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
  logger.info("Event", { event: stateInput as any });
  logger.addPersistentLogAttributes({ correlationIds: { jobId: stateInput.jobId } });

  // TODO: Replace `createCspResponse` with `cspRequest` when
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

export async function createCspResponse(request: ProvisionRequest): Promise<CspResponse> {
  let response: CspResponse;
  switch (request.targetCsp.name) {
    case "CSP_A":
      response = {
        code: 200,
        content: {
          response: { some: "good content" },
          request,
        },
      };
      logger.info("Success response", { response: response as any });
      return response;
    case "CSP_B":
      response = {
        code: 400,
        content: {
          response: { some: "bad content" },
          request,
        },
      };
      logger.error("Failed response", { response: response as any });
      return response;
    case "CSP_C":
    case "CSP_D":
      response = {
        code: 500,
        content: {
          response: { some: "internal error" },
          request,
        },
      };
      logger.error("Internal error response", { response: response as any });
      return response;
    default:
      response = await cspRequest({ requestType: CspRequest.PROVISION, body: request });
      logger.info("Mock response", { response: response as any });
      return response;
  }
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(validator({ eventSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
