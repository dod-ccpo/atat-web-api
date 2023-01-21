import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import { provisionResponseSchema, ProvisionCspResponse } from "../../models/provisioning-jobs";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { tracer } from "../../utils/tracing";

const MESSAGE_GROUP_ID = "provisioning-queue-message-group";

/**
 * Result Lambda - Takes Step Fn input and sends to SQS Queue to be consumed
 * by a scheduled job in Service Now.
 *
 * @param stateInput - input to the state task that is processed
 */
export async function baseHandler(stateInput: ProvisionCspResponse): Promise<ProvisionCspResponse> {
  let queueUrl = process.env.PROVISIONING_QUEUE_URL ?? "";
  // Use the async queue if this is an async request.
  if ("location" in (stateInput.content.response ?? {})) {
    queueUrl = process.env.ASYNC_PROVISIONING_JOBS_QUEUE_URL ?? "";
  }
  logger.info("Sending result message to queue", {
    messageData: {
      queue: queueUrl,
      messageGroupId: MESSAGE_GROUP_ID,
    },
  });
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(stateInput),
      MessageGroupId: MESSAGE_GROUP_ID,
    })
  );

  return stateInput;
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(validator({ eventSchema: transpileSchema(provisionResponseSchema, { verbose: true }) }))
  .use(errorHandlingMiddleware());
