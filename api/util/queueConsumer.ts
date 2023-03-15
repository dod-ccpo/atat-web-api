import { DeleteMessageCommand, ReceiveMessageCommand, ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jsonErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { tracer } from "../../utils/tracing";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { LoggingContextMiddleware } from "../../utils/middleware/logging-context-middleware";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";

export abstract class QueueConsumer<T> {
  /**
   * The maximum number of messages to read from the queue on each event.
   */
  protected readonly maxMessages = 10;

  readonly handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

  constructor(queueUrl: string) {
    this.handler = async (): Promise<APIGatewayProxyResult> => {
      // poll messages from the queue
      const receiveMessageInput: ReceiveMessageCommandInput = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: this.maxMessages,
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
        const processedRecord = this.processMessage(record.Body);
        if (processedRecord === undefined) {
          // Skip further processing (and avoid returning) if undefined
          logger.info("Skipping removal & return for message", { message: record.Body });
          continue;
        }
        messages.push(processedRecord);

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

  /**
   * Process the record for removal from the Queue.
   *
   * If the record is not ready to be removed, return `undefined` to prevent removal.
   */
  abstract processMessage(message: string | undefined): T | undefined;

  createHandler() {
    return middy(this.handler)
      .use(injectLambdaContext(logger, { clearState: true }))
      .use(captureLambdaHandler(tracer))
      .use(LoggingContextMiddleware())
      .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
      .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
      .use(errorHandlingMiddleware())
      .use(jsonErrorHandlerMiddleware());
  }
}
