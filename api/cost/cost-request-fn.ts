import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import errorLogger from "@middy/error-logger";
import inputOutputLogger from "@middy/input-output-logger";
import { SQSEvent, SQSRecord } from "aws-lambda";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CostRequest, CostResponse } from "../../models/cost-jobs";
import { makeClient } from "../../utils/atat-client";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { logger } from "../../utils/logging";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import { tracer } from "../../utils/tracing";
import { AtatApiError, AtatClient, IAtatClient } from "../client";

const COST_RESPONSE_QUEUE_URL = process.env.COST_RESPONSE_QUEUE_URL ?? "";
export const MESSAGE_GROUP_ID = "cost-response-queue-message-group";

async function makeRequest(client: IAtatClient, request: CostRequest): Promise<CostResponse> {
  try {
    const cspResponse = await client.getCostsByPortfolio({
      portfolioId: request.portfolioId,
      startDate: request.startDate,
      endDate: request.endDate,
    });
    return {
      code: cspResponse.$metadata.status,
      content: {
        request,
        response: cspResponse.costs,
      },
    };
  } catch (err: unknown) {
    // Re-throw any unsupported error type
    if (!err || typeof err !== "object" || !(err instanceof AtatApiError)) {
      throw err;
    }

    // TODO: Make this more safe if these fields are in fact undefined. If they are
    // undefined there's not really much to do to recover though; they're required by
    // the specification. If they're absent, something has gone quite wrong.
    return {
      code: err.response!.status,
      content: {
        response: err.response?.data,
        request,
      },
    };
  }
}

async function baseHandler(event: SQSEvent): Promise<void> {
  const processedMessages: CostRequest[] = [];
  if (!event?.Records?.length) {
    logger.info("There are no records in this request.");
  }
  const costRequests = event.Records.map((record: SQSRecord) => record.body).map(
    (body: string) => JSON.parse(body) as CostRequest
  );
  for (const request of costRequests) {
    processedMessages.push(request);
    const client = await makeClient(request.targetCsp.name);
    const costResponse = await makeRequest(client, request);
    const sqsResponse = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: COST_RESPONSE_QUEUE_URL,
        MessageBody: JSON.stringify(costResponse),
        MessageGroupId: MESSAGE_GROUP_ID,
      })
    );
    logger.info("Sent message", { sqsResponse });
  }

  logger.info("Records processed: ", { processedMessages });
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
