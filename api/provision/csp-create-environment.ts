import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { Context } from "aws-lambda";
import jsonErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { HothProvisionRequest, NewEnvironmentPayload } from "../../models/provisioning-jobs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { tracer } from "../../utils/tracing";
import { CspResponse } from "../util/csp-request";
import { AtatApiError, IAtatClient, AddEnvironmentRequest, ProvisionCspResponse } from "../client";
import * as atatApiTypes from "../client/types";
import { makeClient } from "../../utils/atat-client";
import { provisionRequestSchema } from "../../models/provisioning-schemas";

function transformSynchronousResponse(
  response: atatApiTypes.AddEnvironmentResponseSync,
  addEnvironmentRequest: AddEnvironmentRequest,
  hothProvisionRequest: HothProvisionRequest
): CspResponse<AddEnvironmentRequest, atatApiTypes.AddEnvironmentResponseSync> {
  return {
    code: response.$metadata.status,
    content: {
      response,
      request: addEnvironmentRequest,
    },
    initialSnowRequest: hothProvisionRequest,
  };
}

function transformAsynchronousResponse(
  response: atatApiTypes.AsyncProvisionResponse,
  addEnvironmentRequest: AddEnvironmentRequest,
  hothProvisionRequest: HothProvisionRequest
): CspResponse<AddEnvironmentRequest, atatApiTypes.AsyncProvisionResponse | { details: string }> {
  if (response.location) {
    return {
      code: response.$metadata.status,
      content: {
        response,
        request: addEnvironmentRequest,
      },
      initialSnowRequest: hothProvisionRequest,
    };
  }
  return {
    code: 500,
    content: {
      response: {
        details: "Location header was invalid or not provided",
      },
      request: addEnvironmentRequest,
    },
    initialSnowRequest: hothProvisionRequest,
  };
}

async function makeRequest(client: IAtatClient, request: HothProvisionRequest): Promise<ProvisionCspResponse> {
  // This function will always be operating for creating new portfolios; if we have something
  // else, this will be a non-recoverable error anyway.
  const payload = request.payload as NewEnvironmentPayload;

  if (!request.portfolioId) {
    throw new AtatApiError("Invalid ID supplied", "InvalidPortfolioId", request);
  }

  const addEnvironmentRequest: atatApiTypes.AddEnvironmentRequest = {
    portfolioId: request.portfolioId,
    environment: {
      name: payload.name,
      administrators: payload.administrators,
      classificationLevel: payload.classificationLevel,
      cloudDistinguisher: payload.cloudDistinguisher,
    },
  };
  try {
    logger.info("Making an actual CSP request w/ atat-client - CspWritePortfolio");
    const cspResponse = await client.addEnvironment(addEnvironmentRequest);
    if (cspResponse.$metadata.status === 202) {
      const asyncResponse = cspResponse as atatApiTypes.AddEnvironmentResponseAsync;
      return transformAsynchronousResponse(asyncResponse, addEnvironmentRequest, request);
    }
    return transformSynchronousResponse(
      cspResponse as atatApiTypes.AddEnvironmentResponseSync,
      addEnvironmentRequest,
      request
    );
  } catch (err) {
    // Re-throw any unsupported error type
    if (!err || typeof err !== "object" || !(err instanceof AtatApiError)) {
      throw err;
    }

    // TODO: Make this more safe if these fields are in fact undefined. If they are
    // undefined there's not really much to do to recover though; they're required by
    // the specification. If they're absent, something has gone quite wrong.
    return {
      code: err.response!.status,
      content: {
        response: err.response?.data,
        request: addEnvironmentRequest,
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
  .use(validator({ eventSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware())
  .use(jsonErrorHandlerMiddleware());
