import { handler } from "./cost-request-fn";
import { requestContext } from "../provision/start-provisioning-job.test";
import { APIGatewayProxyEvent, Context, SQSEvent } from "aws-lambda";
import * as crypto from "crypto";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { mockReceiveMessageResponse } from "../provision/consume-provisioning-job.test";
import { Network } from "../../models/cloud-service-providers";
import { SuccessStatusCode } from "../../utils/response";

export const validRequestBody = {
  requestId: "5e1ec388-4a04-47ec-a3c9-6775f2a82d28",
  portfolioId: "1c071937-0a4d-4bc0-98f0-48c0e79bb972",
  targetCsp: {
    uri: "https://cspA.com/",
    name: "CSP_A",
    network: Network.NETWORK_1,
  },
  startDate: "2019-03-03",
  endDate: "2020-04-30",
};
const validRequest = {
  body: JSON.stringify(validRequestBody),
  requestContext,
} as any;

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

describe("Happy path", () => {
  it("message sent to request queue", async () => {
    // GIVEN
    const queueEvent = generateTestEvent(validRequest.body);
    const mockResponse = generateMockMessageResponses([validRequest.body]);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    // WHEN
    await handler(queueEvent, {} as Context);
    const sentMessage: any = sqsMock.call(0).args[0].input;
    // THEN
    expect(JSON.parse(sentMessage.MessageBody).content.requestBody).toEqual(JSON.parse(validRequest.body));
  });
});

describe("Sad path", () => {
  it.skip("should return error", async () => {
    // GIVEN
    const badRequest = { ...validRequest, body: JSON.stringify(validRequestBody.targetCsp) };
    const queueEvent = generateTestEvent(badRequest);
    // WHEN
    await handler(queueEvent, {} as Context);
    // THEN
    // expect(handlerSpy).toBeCalledWith(queueEvent.Records);
  });
});

function generateTestEvent(body: string): SQSEvent {
  return {
    Records: [
      {
        body,
        messageId: "0",
        messageAttributes: {},
        receiptHandle: "",
        eventSource: "",
        eventSourceARN: "",
        awsRegion: "us-east-1",
        attributes: {
          ApproximateFirstReceiveTimestamp: "",
          ApproximateReceiveCount: "0",
          SentTimestamp: "",
          SenderId: "",
        },
        // The use of MD5 here is not for any cryptographic purpose. It is
        // to mock a field of a Lambda event. This is only used for the
        // purposes of a basic validation (much like CRC).
        md5OfBody: crypto.createHash("md5").update(body).digest("hex"),
      },
    ],
  };
}

function generateMockMessageResponses(messageBodies: any[]) {
  const messages = messageBodies.map((body) => {
    return {
      MessageId: "b5353c",
      ReceiptHandle: "AQC0e6b=",
      MD5OfBody: "b03",
      Body: JSON.stringify(body),
      Attributes: undefined,
      MD5OfMessageAttributes: undefined,
      MessageAttributes: undefined,
    };
  });

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: "74b3f95",
      extendedRequestId: undefined,
      cfId: undefined,
      attempts: 1,
      totalRetryDelay: 0,
    },
    Messages: messages,
  };
}
