import {
  AddPortfolioResponseAsync,
  GetProvisioningStatusRequest,
  GetProvisioningStatusResponse,
  IAtatClient,
  ProvisioningStatusType,
} from "../client";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { logger } from "../../utils/logging";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { makeClient } from "../../utils/atat-client";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { tracer } from "../../utils/tracing";

const PROVISIONING_QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";
const MESSAGE_GROUP_ID = "processed-async-events";

async function makeRequest(client: IAtatClient, request: ProvisionRequest): Promise<ProvisionRequest | undefined> {
  const origResponse: GetProvisioningStatusResponse | AddPortfolioResponseAsync = request.cspResponse!.content
    .response as GetProvisioningStatusResponse | AddPortfolioResponseAsync;
  const requestBody: GetProvisioningStatusRequest = {
    location: origResponse.location,
  };
  const mockCspNames = ["CSP_B", "CSP_C", "CSP_F"];
  if (mockCspNames.includes(origResponse.$metadata.request.targetCsp.name)) {
    const cspMockResponse = mockCspClientResponse(origResponse.$metadata.request);
    const mockResponse = {
      code: request.code,
      content: {
        request: requestBody,
        response: cspMockResponse,
      },
    };
    if (
      cspMockResponse.status.status === ProvisioningStatusType.COMPLETE ||
      cspMockResponse.status.status === ProvisioningStatusType.FAILED
    ) {
      return mockResponse;
    }
    return undefined;
  }

  logger.info("Should not reach here at the current moment because of mocking.");
  const cspResponse = await client.getProvisioningStatus(requestBody);
  if (
    cspResponse.status.status === ProvisioningStatusType.COMPLETE ||
    cspResponse.status.status === ProvisioningStatusType.FAILED
  ) {
    return {
      ...request,
      cspResponse: {
        code: cspResponse.$metadata.status,
        content: {
          request: requestBody,
          response: cspResponse,
        },
      },
    };
  }
  return undefined;
}

async function baseHandler(event: SQSEvent): Promise<SQSBatchResponse> {
  // The item IDs for records that are still in the IN_PROGRESS or NOT_STARTED state
  const stillInProgress: string[] = [];
  // Items that have moved to the COMPELTE or FAILED state
  const moveToReady: ProvisionRequest[] = [];
  if (!event?.Records?.length) {
    logger.info("There are no records in this request.");
  }
  for (const record of event.Records) {
    const request = JSON.parse(record.body) as ProvisionRequest;
    const client = await makeClient(request.targetCsp.name);
    const provisioningStatus = await makeRequest(client, request);
    if (provisioningStatus) {
      moveToReady.push(provisioningStatus);
    } else {
      stillInProgress.push(record.messageId);
    }
  }
  for (const request of moveToReady) {
    const sqsResponse = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: PROVISIONING_QUEUE_URL,
        MessageBody: JSON.stringify(request),
        MessageGroupId: MESSAGE_GROUP_ID,
      })
    );
  }
  // Even though these didn't fail, pretending that they did means that Lambda
  // will not remove them from the Queue and they'll be able to be picked up again
  // after the visibility timeout.
  return {
    batchItemFailures: stillInProgress.map((item) => ({ itemIdentifier: item })),
  };
}
export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
