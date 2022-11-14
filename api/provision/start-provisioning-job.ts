import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { APIGatewayProxyResult } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { RequestEvent } from "../../models/document-generation";
import { ProvisionRequest, provisionRequestSchema } from "../../models/provisioning-jobs";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { logger } from "../../utils/logging";
import { cspPortfolioIdChecker } from "../../utils/middleware/check-csp-portfolio-id";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { LoggingContextMiddleware } from "../../utils/middleware/logging-context-middleware";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import xssSanitizer from "../../utils/middleware/xss-sanitizer";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { tracer } from "../../utils/tracing";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Starts provisioning request from SNOW and starts the Step Function execution
 *
 * @param event - POST request from API Gateway with provisioning job properties
 */
export async function baseHandler(event: RequestEvent<ProvisionRequest>): Promise<APIGatewayProxyResult> {
  try {
    // starting the execution
    const sfnInput = {
      ...event.body,
    };
    await sfnClient.startExecution({
      input: JSON.stringify({ initialSnowRequest: sfnInput }),
      stateMachineArn: SFN_ARN,
    });

    return new ApiSuccessResponse(sfnInput, SuccessStatusCode.CREATED);
  } catch (error) {
    logger.error("An error occurred processing the event", error as Error);
    return REQUEST_BODY_INVALID;
  }
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(LoggingContextMiddleware())
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(xssSanitizer())
  .use(cspPortfolioIdChecker())
  .use(validator({ eventSchema: wrapSchema(provisionRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
