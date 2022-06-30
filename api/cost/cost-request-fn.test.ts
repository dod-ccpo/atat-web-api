import { handler, MESSAGE_GROUP_ID } from "./cost-request-fn";
import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { Network } from "../../models/cloud-service-providers";
import axios from "axios";
import * as idpClient from "../../idp/client";
import * as cspConfig from "../provision/csp-configuration";
import {
  validCostRequest,
  generateMockMessageResponses,
  generateTestSQSEvent,
  constructCspTarget,
} from "../util/common-test-fixtures";

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

const cspMock = constructCspTarget("CSP_Mock", Network.NETWORK_1);
describe("Cost Request Fn", () => {
  it("poll messages from request queue and send to response queue", async () => {
    // GIVEN
    const validMessages = [
      validCostRequest,
      {
        ...validCostRequest,
        requestId: "7w1er266-4a04-47ec-a3c9-6775f2a82d28",
        targetCsp: cspMock,
      },
    ];
    const queueEvent = generateTestSQSEvent(validMessages);
    const mockResponse = generateMockMessageResponses(validMessages);
    mockedConfig.mockResolvedValue({ uri: cspMock.uri });
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
    expect(JSON.parse(firstSentMessage.MessageBody).content.request).toEqual(validMessages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(secondSentMessage.MessageBody).content.request).toEqual(validMessages[1]);
    expect(secondSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
  });
});
