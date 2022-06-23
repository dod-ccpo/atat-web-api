import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import validator from "@middy/validator";
import { ProvisionRequest, provisionRequestSchema } from "../../models/provisioning-jobs";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";

const MESSAGE_GROUP_ID = "provisioning-queue-message-group";

/**
 * Result Lambda - Takes Step Fn input and sends to SQS Queue to be consumed
 * by a scheduled job in Service Now.
 *
 * @param stateInput - input to the state task that is processed
 */

export async function baseHandler(stateInput: ProvisionRequest): Promise<ProvisionRequest> {
  const QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";
  logger.info("Sending result message to queue", {
    messageData: {
      queue: QUEUE_URL,
      messageGroupId: MESSAGE_GROUP_ID,
    },
  });
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(stateInput),
      MessageGroupId: MESSAGE_GROUP_ID,
    })
  );

  return stateInput;
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(validator({ ajvOptions: { verbose: true }, eventSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware());
