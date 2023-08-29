import { handler, MESSAGE_GROUP_ID } from "./async-provisioning-check";
import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import * as client from "../client";
import { ProvisioningStatusType } from "../client";
import {
  constructProvisionRequestForCsp,
  CSP_A,
  CSP_A_TEST_ENDPOINT,
  CSP_B,
  CSP_B_TEST_ENDPOINT,
  cspAAddPortfolioRequest,
  generateMockMessageResponses,
  generateTestSQSEvent,
} from "../util/common-test-fixtures";
import * as types from "../client/types";
import * as atatClientHelper from "../../utils/atat-client";
import { ErrorStatusCode, ValidationErrorResponse } from "../../utils/response";
import { TEST_CSP_ENDPOINT } from "../client/fixtures";

// Mocks
jest.mock("../../utils/atat-client");
const mockedMakeClient = atatClientHelper.makeClient as jest.MockedFn<typeof atatClientHelper.makeClient>;
const sqsMock = mockClient(sqsClient);

beforeEach(() => {
  jest.resetAllMocks();
  sqsMock.reset();
});

describe("Async Provisioning Checker - Success", () => {
  // TODO: troubleshoot this test
  it.skip("poll messages from AsyncProvisioningQueue and send completed jobs to ProvisioningQueue", async () => {
    // GIVEN
    const messages = [
      {
        code: 202,
        content: {
          response: {
            location: CSP_A_TEST_ENDPOINT,
            status: {
              status: ProvisioningStatusType.SUCCESS,
            },
            $metadata: {
              status: 202,
              request: {
                targetCspName: CSP_A_TEST_ENDPOINT,
              },
            },
          },
          request: {
            location: CSP_A_TEST_ENDPOINT,
          },
        },
        initialSnowRequest: constructProvisionRequestForCsp(CSP_A, cspAAddPortfolioRequest),
      },
      {
        code: 400,
        content: {
          response: {
            location: CSP_B_TEST_ENDPOINT,
            status: {
              status: ProvisioningStatusType.FAILURE,
            },
            $metadata: {
              status: 400,
              request: {
                targetCspName: CSP_B,
              },
            },
          },
          request: {
            location: CSP_B_TEST_ENDPOINT,
          },
        },
        initialSnowRequest: constructProvisionRequestForCsp(CSP_B, cspAAddPortfolioRequest),
      },
    ];
    const queueEvent = generateTestSQSEvent(messages);
    const mockResponse = generateMockMessageResponses(messages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);

    // WHEN
    await handler(queueEvent, {} as Context);

    // THEN
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    const firstSentMessage: any = commandCalls[0].firstArg.input;
    const secondSentMessage: any = commandCalls[1].firstArg.input;
    expect(commandCalls).toBeTruthy();
    expect(commandCalls.length).toEqual(2);
    expect(JSON.parse(firstSentMessage.MessageBody)).toEqual(messages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
    expect(JSON.parse(secondSentMessage.MessageBody)).toEqual(messages[1]);
    expect(secondSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
  });
  it("record not finished processing so placed back on queue as a failed item", async () => {
    // GIVEN
    const cspF = {
      name: "CSP_F",
      uri: "https://cspF.example.com",
      network: "NETWORK_3",
    };

    // GIVEN
    const messages = [
      {
        code: 202,
        content: {
          response: {
            location: cspF.uri,
            status: {
              status: ProvisioningStatusType.IN_PROGRESS,
            },
            $metadata: {
              status: 202,
              request: {
                targetCsp: cspF,
              },
            },
          },
          request: {
            location: cspF.uri,
          },
        },
        initialSnowRequest: constructProvisionRequestForCsp("CSP_F", cspAAddPortfolioRequest),
      },
    ];
    const queueEvent = generateTestSQSEvent(messages);
    const mockResponse = generateMockMessageResponses(messages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);

    // WHEN
    const response = await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);

    // THEN
    expect(commandCalls.length).toEqual(0); // only one request, still in progress
    expect(response.batchItemFailures.length).toEqual(1);
  });
  it("Use atat-client (mocking) to make request to a real CSP - FAILED", async () => {
    const cspMock = {
      name: "CSP_Mock",
      uri: "https://realCsp.example.com/v1/",
    };
    const failedMessage = {
      code: 400,
      content: {
        response: {
          location: cspMock.uri,
          status: {
            status: ProvisioningStatusType.FAILURE,
            provisioningJobId: "",
            portfolioId: "",
          },
          $metadata: {
            status: 400,
            request: {
              targetCsp: { name: cspMock.name },
            },
            response: {},
          },
        },
        request: {
          location: cspMock.uri,
        },
      },
      initialSnowRequest: constructProvisionRequestForCsp("CSP_Mock", cspAAddPortfolioRequest),
    };

    // GIVEN
    const messages = [failedMessage];
    const queueEvent = generateTestSQSEvent(messages);
    const mockResponse = generateMockMessageResponses(messages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);
    jest
      .spyOn(client.AtatClient.prototype, "getProvisioningStatus")
      .mockImplementation((): Promise<types.GetProvisioningStatusResponse> => {
        return Promise.resolve({
          status: {
            provisioningJobId: "",
            portfolioId: "",
            status: ProvisioningStatusType.FAILURE,
          },
          location: cspMock.uri,
          $metadata: failedMessage.content.response.$metadata,
        });
      });
    mockedMakeClient.mockResolvedValue(new client.AtatClient("SAMPLE", TEST_CSP_ENDPOINT));

    // WHEN
    await handler(queueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);
    const firstSentMessage: any = commandCalls[0].firstArg.input;

    // THEN
    expect(commandCalls).toBeTruthy();
    expect(commandCalls.length).toEqual(1);
    expect(JSON.parse(firstSentMessage.MessageBody)).toEqual(messages[0]);
    expect(firstSentMessage.MessageGroupId).toEqual(MESSAGE_GROUP_ID);
  });
  it("no records to process", async () => {
    // GIVEN
    const emptyQueueEvent = generateTestSQSEvent([]);

    // WHEN
    const response = await handler(emptyQueueEvent, {} as Context);
    const commandCalls = sqsMock.commandCalls(SendMessageCommand);

    // THEN
    expect(commandCalls.length).toBe(0);
    expect(response.batchItemFailures.length).toEqual(0);
  });
});

describe("Async Provisioning Checker - Errors", () => {
  it("No initial SNOW request provided", async () => {
    // GIVEN
    const messages = [
      {
        code: 202,
        content: {
          response: {},
          request: {},
        },
        // initialSnowRequest: {},
      },
    ];
    const queueEvent = generateTestSQSEvent(messages);
    const mockResponse = generateMockMessageResponses(messages);
    sqsMock.on(SendMessageCommand).resolves(mockResponse);

    // WHEN
    const response = (await handler(queueEvent, {} as Context)) as unknown as ValidationErrorResponse;

    // THEN
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
});
