import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import { Context } from "aws-lambda";
import jsonErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { tracer } from "../../utils/tracing";
import {
  AtatApiError,
  HothProvisionRequest,
  IAtatClient,
  UpdateTaskOrderPayload,
  ProvisionCspResponse,
} from "../client";
import * as atatApiTypes from "../client/types";
import { makeClient } from "../../utils/atat-client";
import { transformSynchronousResponse } from "../client/client";
import middy from "@middy/core";
import { transpileSchema } from "@middy/validator/transpile";
import { provisionRequestSchema } from "../../models/provisioning-schemas";
import validator from "@middy/validator";

async function makeRequest(client: IAtatClient, request: HothProvisionRequest): Promise<ProvisionCspResponse> {
  // This function will always be operating for update existing task order; if we have something
  // else, this will be a non-recoverable error anyway.
  const payload = request.payload as UpdateTaskOrderPayload;

  if (!request.portfolioId) {
    throw new AtatApiError("Invalid ID supplied", "InvalidPortfolioId", request);
  }

  if (!payload.taskOrderId) {
    throw new AtatApiError("Invalid ID supplied", "InvalidTaskOrderId", request);
  }

  const updateTaskOrderRequest: atatApiTypes.UpdateTaskOrderRequest = {
    portfolioId: request.portfolioId,
    taskOrderId: payload.taskOrderId,
    taskOrder: payload.taskOrder,
  };
  try {
    logger.info(`Invoking updateTaskOrder against CSP ${request.targetCspName}`);
    const cspResponse = await client.updateTaskOrder(updateTaskOrderRequest);
    return transformSynchronousResponse(cspResponse, updateTaskOrderRequest, request);
  } catch (err) {
    // Re-throw any unsupported error type
    if (!err || typeof err !== "object" || !(err instanceof AtatApiError)) {
      throw err;
    }

    // TODO: Make this more safe if these fields are in fact undefined. If they are
    // undefined there's not really much to do to recover though; they're required by
    // the specification. If they're absent, something has gone quite wrong.
    // if the response object is null, then set the status to be 999
    return {
      code: err.response?.status ?? 999,
      content: {
        response: err.response?.data,
        request: updateTaskOrderRequest,
      },
    };
  }
}

/**
 * Make a provisioning request to the Cloud Service Provider.
 *
 * The output of this function is set as the `cspResponse` field by the Step
 * Functions state machine.
 *
 * @param stateInput - Csp Invocation request
 * @return - CspResponse or throw error for 500 or above
 */
export async function baseHandler(
  stateInput: HothProvisionRequest,
  // Disable no-unused-vars because middy handler's require this function signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: Context
): Promise<ProvisionCspResponse | ValidationErrorResponse> {
  logger.addPersistentLogAttributes({ correlationIds: { jobId: stateInput.jobId } });
  const client = await makeClient(stateInput.targetCspName);
  return makeRequest(client, stateInput);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(validator({ eventSchema: transpileSchema(provisionRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(jsonErrorHandlerMiddleware());
