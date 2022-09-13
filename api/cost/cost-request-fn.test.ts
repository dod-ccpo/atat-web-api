import { handler, MESSAGE_GROUP_ID } from "./cost-request-fn";
import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import * as idpClient from "../../idp/client";
import * as cspConfig from "../provision/csp-configuration";
import * as client from "../client";
import {
  validCostRequest,
  generateMockMessageResponses,
  generateTestSQSEvent,
  constructCspTarget,
} from "../util/common-test-fixtures";
import { CostResponseByPortfolio, GetCostsByPortfolioResponse } from "../client";
import * as atatClientHelper from "../../utils/atat-client";

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

const FAKE_COST_DATA: CostResponseByPortfolio = {
  taskOrders: [
    {
      taskOrderNumber: "1234567890123",
      clins: [
        {
          clinNumber: "0001",
          actual: [
            {
              total: "123.00",
              results: [
                { month: "2022-01", value: "1.00" },
                { month: "2022-02", value: "12.00" },
                { month: "2022-03", value: "110.00" },
              ],
            },
          ],
          forecast: [
            {
              total: "1350.00",
              results: [
                { month: "2022-04", value: "150.00" },
                { month: "2022-05", value: "150.00" },
                { month: "2022-06", value: "150.00" },
                { month: "2022-07", value: "150.00" },
                { month: "2022-08", value: "150.00" },
                { month: "2022-09", value: "150.00" },
                { month: "2022-10", value: "150.00" },
                { month: "2022-11", value: "150.00" },
                { month: "2022-12", value: "150.00" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const cspMock = constructCspTarget("CSP_Mock", "NETWORK_1");
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
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    jest.spyOn(client.AtatClient.prototype, "getCostsByPortfolio").mockImplementation(() => {
      return Promise.resolve({
        $metadata: { status: 200, response: { costs: FAKE_COST_DATA }, request: {} },
        costs: FAKE_COST_DATA,
      } as GetCostsByPortfolioResponse);
    });
    mockedMakeClient.mockResolvedValue(new client.AtatClient("SAMPLE", { uri: "http://fake.example.com" }));

    // WHEN
    await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    const firstSentMessage: any = commandCalls[0].firstArg.input;
    const secondSentMessage: any = commandCalls[1].firstArg.input;

    // THEN
    expect(JSON.parse(firstSentMessage.MessageBody).content.request).toEqual(validMessages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(firstSentMessage.MessageBody).content.response).toEqual(FAKE_COST_DATA);
    expect(JSON.parse(secondSentMessage.MessageBody).content.request).toEqual(validMessages[1]);
    expect(secondSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(secondSentMessage.MessageBody).content.response).toEqual(FAKE_COST_DATA);
  });
});
