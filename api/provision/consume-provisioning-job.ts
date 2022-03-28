import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import middy from "@middy/core";
import { DeleteMessageCommand, ReceiveMessageCommand, ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";

const SQS_URL = process.env.SQS_URL ?? "";

export async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // poll messages from the queue
  const receiveMessageInput: ReceiveMessageCommandInput = {
    QueueUrl: SQS_URL,
    MaxNumberOfMessages: 10,
  };
  const receiveMessageCommand = new ReceiveMessageCommand(receiveMessageInput);
  const consumedMessages = await sqsClient.send(receiveMessageCommand);

  // Messages is undefined if queue empty
  if (!consumedMessages.Messages) {
    return new ApiSuccessResponse([], SuccessStatusCode.OK);
  }
  console.log("Number of Messages: ", consumedMessages.Messages?.length);

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
    const deleteInput = { QueueUrl: SQS_URL, ReceiptHandle: record.ReceiptHandle };
    const deleteMessageCommand = new DeleteMessageCommand(deleteInput);
    const deletedMessage = await sqsClient.send(deleteMessageCommand);
    console.log("Message Deleted: ", deletedMessage);
  }

  console.log("Number of Messages: ", messages.length);
  return new ApiSuccessResponse(messages, SuccessStatusCode.OK);
}

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
