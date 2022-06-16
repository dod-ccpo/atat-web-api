import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import {
  ApiSuccessResponse,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../../utils/response";
import { handler } from "./start-cost-job";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { CostRequest } from "../../models/cost-jobs";

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

const validCostRequest: CostRequest = {
  requestId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  startDate: "2022-01-01",
  endDate: "2022-12-01",
};
const requestContext = { identity: { sourceIp: "203.0.113.0" } };
const baseApiRequest = {
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

describe("Cost request operations", () => {
  it("should return successfully if no error enqueueing message", async () => {
    const request = {
      ...baseApiRequest,
      body: JSON.stringify(validCostRequest),
    };
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response).toEqual(new ApiSuccessResponse(validCostRequest, SuccessStatusCode.CREATED));
  });

  it("should attempt to send SQS message", async () => {
    process.env.COST_REQUEST_QUEUE_URL = "my url";
    const request = {
      ...baseApiRequest,
      body: JSON.stringify(validCostRequest),
    };
    await handler(request, {} as Context, () => null);

    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
    expect(
      sqsMock.commandCalls(
        SendMessageCommand,
        {
          QueueUrl: "my url",
          MessageBody: JSON.stringify(validCostRequest),
          MessageGroupId: "cost-request-queue-message-group",
        },
        true
      )
    ).toHaveLength(1);
  });

  it("should throw an error if missing startDate", async () => {
    const request = {
      ...baseApiRequest,
      body: JSON.stringify({
        requestId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
        portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
        endDate: "2022-12-01",
      }),
    };
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
  });

  it("should throw an error if missing requestId", async () => {
    const invalidCostRequest = {
      jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
      portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
      startDate: "2022-01-01",
      endDate: "2022-12-01",
    };
    const request = {
      ...baseApiRequest,
      body: JSON.stringify(invalidCostRequest),
    };
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
  });
});
