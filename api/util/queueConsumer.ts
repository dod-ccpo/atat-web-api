import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { DeleteMessageCommand, ReceiveMessageCommand, ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { IpCheckerMiddleware } from "../../utils/middleware/ip-logging";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";

export abstract class QueueConsumer<T> {
  readonly handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

  constructor(queueUrl: string) {
    this.handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      // poll messages from the queue
      const receiveMessageInput: ReceiveMessageCommandInput = {
        QueueUrl: queueUrl,
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
      const messages: T[] = [];
      for (const record of consumedMessages.Messages) {
        // messages being returned to client
        messages.push(this.processMessage(record.Body));

        // deleting message after processing
        const deleteInput = { QueueUrl: queueUrl, ReceiptHandle: record.ReceiptHandle };
        const deleteMessageCommand = new DeleteMessageCommand(deleteInput);
        const deletedMessageResponse = await sqsClient.send(deleteMessageCommand);
        logger.debug("Message Deleted", { deletedMessageResponse } as any);
      }

      logger.info(`Number of Messages processed ${messages.length}`);
      return new ApiSuccessResponse(messages, SuccessStatusCode.OK);
    };
  }

  abstract processMessage(message: string | undefined): T;

  createHandler() {
    return middy(this.handler)
      .use(injectLambdaContext(logger))
      .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
      .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
      .use(IpCheckerMiddleware())
      .use(errorHandlingMiddleware())
      .use(JSONErrorHandlerMiddleware());
  }
}
