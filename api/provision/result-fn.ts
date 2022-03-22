import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import validator from "@middy/validator";
import { provisionRequestSchema, ProvisionRequest } from "../../models/provisioning-jobs";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";

/**
 * Result Lambda - Takes Step Fn input and sends to SQS Queue to be consumed
 * by a scheduled job in Service Now.
 *
 * @param stateInput - input to the state task that is processed
 */

export async function baseHandler(stateInput: ProvisionRequest): Promise<ProvisionRequest> {
  const QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";
  console.log("Sending result message to " + QUEUE_URL);
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(stateInput),
    })
  );

  return stateInput;
}

export const handler = middy(baseHandler)
  .use(validator({ ajvOptions: { verbose: true }, inputSchema: provisionRequestSchema }))
  .use(errorHandlingMiddleware());