import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { APIGatewayProxyResult } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CostRequest, costRequestSchema } from "../../models/cost-jobs";
import { RequestEvent } from "../../models/document-generation";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { LoggingContextMiddleware } from "../../utils/middleware/logging-context-middleware";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import xssSanitizer from "../../utils/middleware/xss-sanitizer";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { tracer } from "../../utils/tracing";

const MESSAGE_GROUP_ID = "cost-request-queue-message-group";

/**
 * Handles requests coming from HOTH client (Service Now) to initiate a Cost Request for a given Portfolio
 *
 * @param event - POST request from API Gateway with cost request job properties
 */
export async function baseHandler(event: RequestEvent<CostRequest>): Promise<APIGatewayProxyResult> {
  const QUEUE_URL = process.env.COST_REQUEST_QUEUE_URL ?? "";
  logger.info("Sending cost request message to queue", {
    messageData: {
      queue: QUEUE_URL,
      messageGroupId: MESSAGE_GROUP_ID,
    },
  });
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(event.body),
      MessageGroupId: MESSAGE_GROUP_ID,
    })
  );
  return new ApiSuccessResponse(event.body, SuccessStatusCode.CREATED);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(LoggingContextMiddleware())
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(xssSanitizer())
  .use(validator({ eventSchema: wrapSchema(costRequestSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
