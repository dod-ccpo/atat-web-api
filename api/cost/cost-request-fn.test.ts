import { handler, MESSAGE_GROUP_ID } from "./cost-request-fn";
import { requestContext } from "../provision/start-provisioning-job.test";
import { Context, SQSEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { Network } from "../../models/cloud-service-providers";
import { CostRequest } from "../../models/cost-jobs";
import axios from "axios";
import * as idpClient from "../../idp/client";
import * as cspConfig from "../provision/csp-configuration";
import * as crypto from "crypto";

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

// Mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;
const sqsMock = mockClient(sqsClient);

beforeEach(() => {
  jest.resetAllMocks();
  sqsMock.reset();
});

describe("Cost Request Fn", () => {
  it("poll messages from request queue and send to response queue", async () => {
    // GIVEN
    const validMessages = [
      validRequestBody,
      {
        ...validRequestBody,
        requestId: "7w1er266-4a04-47ec-a3c9-6775f2a82d28",
        targetCsp: {
          uri: "https://cspMock.com/",
          name: "CSP_Mock",
          network: Network.NETWORK_1,
        },
      },
    ];
    const queueEvent = generateTestEvent(validMessages);
    const mockResponse = generateMockMessageResponses(validMessages);
    mockedConfig.mockResolvedValue({ uri: "https://mockcsp.cspa/atat/" });
    mockedAxios.post.mockResolvedValue({
      data: { code: 200, content: "something" },
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      config: {},
    });
    mockedGetToken.mockResolvedValue({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    sqsMock.on(SendMessageCommand).resolves(mockResponse);

    // WHEN
    await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    const firstSentMessage: any = commandCalls[0].firstArg.input;
    const secondSentMessage: any = commandCalls[1].firstArg.input;

    // THEN
    expect(JSON.parse(firstSentMessage.MessageBody).content.requestBody).toEqual(validMessages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(secondSentMessage.MessageBody).content.requestBody).toEqual(validMessages[1]);
    expect(secondSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
  });
});

function generateTestEvent(recordBodies: CostRequest[]): SQSEvent {
  const records = recordBodies.map((body) => {
    const recordBody = JSON.stringify(body);
    return {
      body: recordBody,
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
      md5OfBody: crypto.createHash("md5").update(recordBody).digest("hex"),
    };
  });
  return {
    Records: records,
  };
}

function generateMockMessageResponses(messageBodies: any[]) {
  const messages = messageBodies.map((body) => {
    const messageBody = JSON.stringify(body);
    return {
      MessageId: "b5353c",
      ReceiptHandle: "AQC0e6b=",
      MD5OfBody: crypto.createHash("md5").update(messageBody).digest("hex"),
      Body: messageBody,
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
