import { handler, MESSAGE_GROUP_ID } from "./cost-request-fn";
import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import * as idpClient from "../../idp/client";
import * as cspConfig from "../provision/csp-configuration";
import * as client from "../client";
import { AtatClient, GetCostsByPortfolioResponse } from "../client";
import {
  constructCspTarget,
  CSP_A,
  FAKE_COST_DATA,
  generateMockMessageResponses,
  generateTestSQSEvent,
  validCostRequest,
} from "../util/common-test-fixtures";
import * as atatClientHelper from "../../utils/atat-client";
import { AxiosResponse } from "axios";
import { CostRequest } from "../../models/cost-jobs";
import { ErrorStatusCode, OtherErrorResponse } from "../../utils/response";
import { TEST_CSP_ENDPOINT } from "../client/fixtures";

// Mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
mockedConfig.mockImplementation(() => Promise.resolve({ name: "test", uri: "https://csp.example.com/atat/api/test" }));
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;
mockedGetToken.mockImplementation(() =>
  Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
);
jest.mock("../../utils/atat-client");
const mockedMakeClient = atatClientHelper.makeClient as jest.MockedFn<typeof atatClientHelper.makeClient>;
const sqsMock = mockClient(sqsClient);

beforeEach(() => {
  jest.resetAllMocks();
  sqsMock.reset();
});

describe("Cost Request Fn - Success", () => {
  it("poll messages from request queue and send to response queue", async () => {
    // GIVEN
    const validMessages = [
      validCostRequest,
      {
        ...validCostRequest,
        requestId: "7w1er266-4a04-47ec-a3c9-6775f2a82d28",
        targetCsp: constructCspTarget(CSP_A),
      },
    ];
    const queueEvent = generateTestSQSEvent(validMessages);
    const mockResponse = generateMockMessageResponses(validMessages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    jest.spyOn(client.AtatClient.prototype, "getCostsByPortfolio").mockImplementation(() => {
      return Promise.resolve({
        $metadata: { status: 200, response: { costs: FAKE_COST_DATA }, request: {} },
        costs: FAKE_COST_DATA,
      } as GetCostsByPortfolioResponse);
    });
    mockedMakeClient.mockResolvedValue(new client.AtatClient("SAMPLE", TEST_CSP_ENDPOINT));

    // WHEN
    await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstSentMessage: any = commandCalls[0].firstArg.input;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secondSentMessage: any = commandCalls[1].firstArg.input;

    // THEN
    expect(JSON.parse(firstSentMessage.MessageBody).content.request).toEqual(validMessages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(firstSentMessage.MessageBody).content.response).toEqual(FAKE_COST_DATA);
    expect(JSON.parse(secondSentMessage.MessageBody).content.request).toEqual(validMessages[1]);
    expect(secondSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(secondSentMessage.MessageBody).content.response).toEqual(FAKE_COST_DATA);
  });
  it("no records in event to process from request queue to response queue", async () => {
    // GIVEN
    const emptyQueueEvent = generateTestSQSEvent([]);

    // WHEN
    await handler(emptyQueueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);

    // THEN
    expect(commandCalls.length).toBe(0);
  });
});

describe("Cost Request Fn - Errors", () => {
  it("request to CSP throws errors and send to queue", async () => {
    // GIVEN
    const invalidCostRequest: CostRequest = {
      ...validCostRequest,
      portfolioId: "",
      targetCspName: "CSP_B",
    };
    const errorMessages = [invalidCostRequest];
    const queueEvent = generateTestSQSEvent(errorMessages);
    const mockResponse = generateMockMessageResponses(errorMessages);
    const axiosBadResponse = {
      status: 404,
      data: { mockPortfolio: "not found" },
    } as AxiosResponse;
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    jest.spyOn(client.AtatClient.prototype, "getCostsByPortfolio").mockImplementation(() => {
      throw new client.AtatApiError("Portfolio not found", "PortfolioNotFound", {}, axiosBadResponse);
    });
    mockedMakeClient.mockResolvedValue(new AtatClient("SAMPLE", TEST_CSP_ENDPOINT));

    // WHEN
    await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstSentMessage: any = commandCalls[0].firstArg.input;

    // THEN
    expect(JSON.parse(firstSentMessage.MessageBody).content.request).toEqual(errorMessages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(firstSentMessage.MessageBody).content.response).toEqual(axiosBadResponse.data);
  });

  // due to mocking CSP internally this test is skipped since there are
  // no external calls using the atat-client
  it.skip("request to CSP throws unknown errors", async () => {
    // GIVEN
    const invalidCostRequest: CostRequest = {
      ...validCostRequest,
      portfolioId: "",
    };
    const errorMessages = [invalidCostRequest];
    const queueEvent = generateTestSQSEvent(errorMessages);
    const mockResponse = generateMockMessageResponses(errorMessages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    jest.spyOn(client.AtatClient.prototype, "getCostsByPortfolio").mockImplementation(() => {
      throw new Error("Unknown Error");
    });
    mockedMakeClient.mockResolvedValue(new AtatClient("SAMPLE", TEST_CSP_ENDPOINT));

    // WHEN
    const result = (await handler(queueEvent, {} as Context)) as unknown as OtherErrorResponse;

    // THEN
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
