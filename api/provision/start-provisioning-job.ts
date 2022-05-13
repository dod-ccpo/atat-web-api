import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import validator from "@middy/validator";
import { APIGatewayProxyResult } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { HttpMethod } from "../../lib/http";
import {
  CspInvocation,
  ProvisionRequest,
  provisionRequestSchema,
  ProvisionRequestType,
  StepFunctionRequestEvent,
} from "../../models/provisioning-jobs";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { logger } from "../../utils/logging";
import { cspPortfolioIdChecker } from "../../utils/middleware/check-csp-portfolio-id";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import xssSanitizer from "../../utils/middleware/xss-sanitizer";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import httpJsonBodyParser from "@middy/http-json-body-parser";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Starts provisioning request from SNOW and starts the Step Function execution
 *
 * @param event - POST request from API Gateway with provisioning job properties
 */
export async function baseHandler(event: StepFunctionRequestEvent<ProvisionRequest>): Promise<APIGatewayProxyResult> {
  try {
    const cspInvocationJob = transformProvisionRequest(event.body);

    logger.info("Sent to Sfn", { request: cspInvocationJob as any });

    // starting the execution
    const sfnInput = {
      ...event.body,
      cspInvocation: cspInvocationJob,
    };
    await sfnClient.startExecution({
      input: JSON.stringify(sfnInput),
      stateMachineArn: SFN_ARN,
    });

    return new ApiSuccessResponse(sfnInput, SuccessStatusCode.CREATED);
  } catch (error) {
    logger.error("An error occurred processing the event", error as Error);
    return REQUEST_BODY_INVALID;
  }
}

/**
 * Transform the request into a CspInvocation object before being
 * sent to AWS Step functions.
 *
 * @param request - provisioning request from SNOW
 * @returns - transformed request to send to the targeted CSP
 */
export function transformProvisionRequest(request: ProvisionRequest): CspInvocation {
  const { operationType, portfolioId, payload, targetCsp } = request;

  const headers = {
    "Content-Type": "application/json",
  };

  switch (operationType) {
    case ProvisionRequestType.ADD_PORTFOLIO:
      return {
        method: HttpMethod.POST,
        headers,
        endpoint: `${targetCsp.uri}/portfolios`,
        payload,
      };
    case ProvisionRequestType.ADD_FUNDING_SOURCE:
      return {
        method: HttpMethod.POST,
        headers,
        endpoint: `${targetCsp.uri}/portfolios/${portfolioId}/task-orders`,
        payload,
      };
    case ProvisionRequestType.ADD_OPERATORS:
      return {
        method: HttpMethod.PATCH,
        headers,
        endpoint: `${targetCsp.uri}/portfolios/${portfolioId}`,
        payload,
      };
    default:
      throw new OtherErrorResponse(`Provision type not found.`, ErrorStatusCode.BAD_REQUEST);
  }
}

export const handler = middy(baseHandler, {})
  .use(injectLambdaContext(logger))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(cspPortfolioIdChecker())
  .use(httpJsonBodyParser())
  .use(validator({ eventSchema: wrapSchema(provisionRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
