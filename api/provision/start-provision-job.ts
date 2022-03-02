import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { ProvisionRequest, provisionRequestSchema, ProvisionRequestType } from "../../models/provisioning";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import middy from "@middy/core";
import validator from "@middy/validator";
import jsonBodyParser from "@middy/http-json-body-parser";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import xssSanitizer from "../../utils/middleware/xss-sanitizer";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { CloudServiceProvider } from "../../models/cloud-service-providers";
import { HttpMethod } from "../../utils/http";
import { CORS_CONFIGURATION, MIDDY_CORS_CONFIGURATION } from "../../utils/cors-config";
import { REQUEST_BODY_INVALID } from "../../utils/errors";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Starts provisioning request from SNOW and starts the Step Function execution
 *
 * @param event - POST request from API Gateway with provisioning job properties
 */
export async function baseHandler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const cspInvocationJob = transformProvisionJob(event.body as any);
    console.log("SentToSfn: " + JSON.stringify(cspInvocationJob));
    // TODO: test execution once sfn infrastructure is up
    // starting the execution
    // const result = await sfnClient.startExecution({
    //   input: JSON.stringify(cspInvocationJob),
    //   stateMachineArn: SFN_ARN,
    // });
    return new ApiSuccessResponse(event.body, SuccessStatusCode.CREATED);
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
function transformProvisionJob(request: ProvisionRequest) {
  const { operationType, portfolioId, payload, targetCsp } = request;

  const headers = {
    "Content-Type": "application/json",
    ...CORS_CONFIGURATION,
  };

  switch (operationType) {
    case ProvisionRequestType.ADD_PORTFOLIO:
      return {
        method: HttpMethod.POST,
        headers,
        endpoint: `${CloudServiceProvider[targetCsp].uri}/portfolios`,
        payload,
      };
    case ProvisionRequestType.ADD_FUNDING_SOURCE:
      return {
        method: HttpMethod.POST,
        headers,
        endpoint: `${CloudServiceProvider[targetCsp].uri}/portfolios/${portfolioId}/task-orders`,
        payload,
      };
    case ProvisionRequestType.ADD_OPERATORS:
      return {
        method: HttpMethod.PATCH,
        headers,
        endpoint: `${CloudServiceProvider[targetCsp].uri}/portfolios/${portfolioId}`,
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
  .use(validator({ inputSchema: wrapSchema(provisionRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(MIDDY_CORS_CONFIGURATION));
