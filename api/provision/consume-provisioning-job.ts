import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { DeleteMessageCommand, ReceiveMessageCommand, ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";

const PROVISIONING_QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";

export async function baseHandler(_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // poll messages from the queue
  const receiveMessageInput: ReceiveMessageCommandInput = {
    QueueUrl: PROVISIONING_QUEUE_URL,
    MaxNumberOfMessages: 10,
  };
  const receiveMessageCommand = new ReceiveMessageCommand(receiveMessageInput);
  const consumedMessages = await sqsClient.send(receiveMessageCommand);

  // Messages is undefined if queue empty
  if (!consumedMessages.Messages) {
    return new ApiSuccessResponse([], SuccessStatusCode.OK);
  }
  logger.info(`Number of Messages to process ${consumedMessages.Messages?.length}`);

  // transform (remove unnecessary data) and gather messages
  const messages: ProvisionRequest[] = [];
  for (const record of consumedMessages.Messages) {
    const { jobId, userId, portfolioId, operationType, targetCsp, payload, cspInvocation, cspResponse } = JSON.parse(
      record.Body ?? ""
    );
    const provisioningRequest = {
      jobId,
      userId,
      portfolioId,
      operationType,
      targetCsp,
      payload,
      cspInvocation,
      cspResponse: cspResponse.Payload,
    };

    // messages being returned to client
    messages.push(provisioningRequest);

    // deleting message after processing
    const deleteInput = { QueueUrl: PROVISIONING_QUEUE_URL, ReceiptHandle: record.ReceiptHandle };
    const deleteMessageCommand = new DeleteMessageCommand(deleteInput);
    const deletedMessageResponse = await sqsClient.send(deleteMessageCommand);
    logger.info("Message Deleted", { deletedMessageResponse } as any);
  }

  logger.info(`Number of Messages processed ${messages.length}`);
  return new ApiSuccessResponse(messages, SuccessStatusCode.OK);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger))
  .use(IpCheckerMiddleware())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
