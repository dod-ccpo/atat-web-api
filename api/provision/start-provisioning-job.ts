import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import errorLogger from "@middy/error-logger";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import { APIGatewayProxyResult } from "aws-lambda";
import jsonErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { RequestEvent } from "../../models/document-generation";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { REQUEST_BODY_INVALID } from "../../utils/errors";
import { logger } from "../../utils/logging";
import { cspPortfolioIdChecker } from "../../utils/middleware/check-csp-portfolio-id";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { LoggingContextMiddleware } from "../../utils/middleware/logging-context-middleware";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { tracer } from "../../utils/tracing";
import { provisionRequestEventSchema } from "../../models/provisioning-schemas";
import { HothProvisionRequest } from "../client";
import validatorMiddleware from "@middy/validator";
import middy from "@middy/core";
import { transpileSchema } from "@middy/validator/transpile";
import httpHeaderNormalizer from "@middy/http-header-normalizer";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Starts provisioning request from SNOW and starts the Step Function execution
 *
 * @param event - POST request from API Gateway with provisioning job properties
 */
export async function baseHandler(event: RequestEvent<HothProvisionRequest>): Promise<APIGatewayProxyResult> {
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
  .use(httpHeaderNormalizer())
  .use(httpJsonBodyParser({ disableContentTypeError: false }))
  .use(cspPortfolioIdChecker())
  .use(validatorMiddleware({ eventSchema: transpileSchema(provisionRequestEventSchema) }))
  .use(errorHandlingMiddleware())
  .use(jsonErrorHandlerMiddleware());
