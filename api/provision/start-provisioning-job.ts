import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import {
  CspInvocation,
  ProvisionRequest,
  provisionRequestSchema,
  ProvisionRequestType,
  StepFunctionRequestEvent,
} from "../../models/provisioning-jobs";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import middy from "@middy/core";
import validator from "@middy/validator";
import jsonBodyParser from "@middy/http-json-body-parser";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import xssSanitizer from "../../utils/middleware/xss-sanitizer";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { HttpMethod } from "../../lib/http";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { cspPortfolioIdChecker } from "../../utils/middleware/check-csp-portfolio-id";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Starts provisioning request from SNOW and starts the Step Function execution
 *
 * @param event - POST request from API Gateway with provisioning job properties
 */
export async function baseHandler(event: StepFunctionRequestEvent<ProvisionRequest>): Promise<APIGatewayProxyResult> {
  try {
    const cspInvocationJob = transformProvisionRequest(event.body);
    console.log("SentToSfn: " + JSON.stringify(cspInvocationJob));

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
    console.log("ERROR: " + JSON.stringify(error));
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

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(cspPortfolioIdChecker())
  .use(validator({ inputSchema: wrapSchema(provisionRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
