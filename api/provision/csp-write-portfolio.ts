import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { Context } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import {
  NewPortfolioPayload,
  ProvisionCspResponse,
  ProvisionRequest,
  provisionRequestSchema,
} from "../../models/provisioning-jobs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { ValidationErrorResponse } from "../../utils/response";
import { tracer } from "../../utils/tracing";
import { CspResponse, mockCspClientResponse } from "../util/csp-request";
import { AtatApiError, IAtatClient } from "../client/client";
import * as atatApiTypes from "../client/types";
import { makeClient } from "../../utils/atat-client";

function transformSynchronousResponse(
  response: atatApiTypes.AddPortfolioResponseSync,
  request: atatApiTypes.AddPortfolioRequest
): CspResponse<atatApiTypes.AddPortfolioRequest, atatApiTypes.AddPortfolioResponseSync> {
  return {
    code: response.$metadata.status,
    content: {
      response,
      request,
    },
  };
}

function transformAsynchronousResponse(
  response: atatApiTypes.AddPortfolioResponseAsync,
  request: atatApiTypes.AddPortfolioRequest
): CspResponse<atatApiTypes.AddPortfolioRequest, atatApiTypes.AddPortfolioResponseAsync | { details: string }> {
  if (response.location) {
    return {
      code: response.$metadata.status,
      content: {
        response,
        request,
      },
    };
  }
  return {
    code: 500,
    content: {
      response: {
        details: "Location header was invalid or not provided",
      },
      request,
    },
  };
}

async function makeRequest(client: IAtatClient, request: ProvisionRequest): Promise<ProvisionCspResponse> {
  // This function will always be operating for creating new portfolios; if we have something
  // else, this will be a non-recoverable error anyway.
  const payload = request.payload as NewPortfolioPayload;
  const creationRequest: atatApiTypes.AddPortfolioRequest = {
    portfolio: {
      name: payload.name,
      administrators: payload.operators,
      taskOrders: payload.fundingSources.map((funding) => ({
        ...funding,
        clins: [{ clinNumber: funding.clin, popStartDate: funding.popStartDate, popEndDate: funding.popEndDate }],
        clin: undefined,
      })),
    },
  };
  try {
    // TODO: remove once mocking is no longer needed (e.g., mocking api implemented or actual csp integration)
    // Intent is to not use the 'client' to make external call
    const mockCspNames = ["CSP_A", "CSP_B", "CSP_C", "CSP_D", "CSP_E", "CSP_F", "CSP_DNE"];
    const response = mockCspClientResponse(request);
    if (response.$metadata.status === 202 && mockCspNames.includes(request.targetCsp.name)) {
      return transformAsynchronousResponse(response, creationRequest);
    }
    if (mockCspNames.includes(request.targetCsp.name)) {
      return transformSynchronousResponse(response, creationRequest);
    }

    logger.info("Should not reach here at the current moment because of mocking.");
    const cspResponse = await client.addPortfolio(creationRequest);
    if (cspResponse.$metadata.status === 202) {
      const asyncResponse = cspResponse as atatApiTypes.AddPortfolioResponseAsync;
      return transformAsynchronousResponse(asyncResponse, creationRequest);
    }
    return transformSynchronousResponse(cspResponse as atatApiTypes.AddPortfolioResponseSync, creationRequest);
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
        request: creationRequest,
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
  stateInput: ProvisionRequest,
  context: Context
): Promise<ProvisionCspResponse | ValidationErrorResponse> {
  logger.addPersistentLogAttributes({ correlationIds: { jobId: stateInput.jobId } });
  const client = await makeClient(stateInput.targetCsp.name);
  return makeRequest(client, stateInput);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(validator({ eventSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
