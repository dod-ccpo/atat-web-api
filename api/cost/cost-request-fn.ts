import middy from "@middy/core";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SQSEvent, SQSRecord } from "aws-lambda";
import { logger } from "../../utils/logging";
import { CostRequest, CspRequest } from "../../models/cost-jobs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { cspRequest } from "../util/csp-request";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";

const COST_RESPONSE_QUEUE_URL = process.env.COST_RESPONSE_QUEUE_URL ?? "";
export const MESSAGE_GROUP_ID = "cost-response-queue-message-group";

async function baseHandler(event: SQSEvent): Promise<void> {
  const processedMessages = [];
  if (event.Records) {
    const records = event.Records.map((record: SQSRecord) => record.body);
    for (const record of records) {
      processedMessages.push(record);

      // get csp response back (using mock)
      const requestBody: CostRequest = JSON.parse(record ?? "");
      const cspResponse = await cspRequest({ requestType: CspRequest.COST, body: requestBody });

      // sendMessage to response queue with CSP response
      const response = await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: COST_RESPONSE_QUEUE_URL,
          MessageBody: JSON.stringify(cspResponse),
          MessageGroupId: MESSAGE_GROUP_ID,
        })
      );
      logger.info("Sent Message: ", { response });
    }
  }
  logger.info("Records processed: ", { processedMessages });
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
