import { Context } from "aws-lambda";
import { handler } from "./result-fn";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { ValidationErrorResponse } from "../../utils/response";
import { match } from "sinon";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsMock = mockClient(sqsClient);

const initialState = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  operationType: "ADD_PORTFOLIO",
  targetCsp: "CSP_A",
  targetNetwork: "NETWORK_1",
  payload: {
    name: "About to change to full PR",
    operators: ["admin1@mail.mil", "superAdmin@mail.mil"],
    fundingSources: [
      {
        taskOrderNumber: "1234567890123",
        clinNumber: "9999",
        popStartDate: "2021-07-01",
        popEndDate: "2022-07-01",
      },
    ],
  },
} as any;

const withResponse = {
  ...initialState,
  cspResponse: {
    code: 200,
    content: {},
  },
};

beforeEach(() => {
  sqsMock.reset();
});

describe("Validate input", () => {
  it("should reject input without cspResponse", async () => {
    const response = await handler(initialState, {} as Context);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect((response as ValidationErrorResponse).statusCode).toBe(400);
  });

  it("should accept input with cspResponse", async () => {
    const response = await handler(withResponse, {} as Context);
    expect(response).not.toBeInstanceOf(ValidationErrorResponse);
    expect((response as ValidationErrorResponse).statusCode).toBe(200);
  });
});

describe("Validate behavior", () => {
  it("should return the complete step fn state", async () => {
    const response = await handler(withResponse, {} as Context);
    expect(response).toEqual(
      expect.objectContaining({
        ...withResponse,
        statusCode: 200,
      })
    );
  });

  it("should attempt to send SQS message", async () => {
    process.env.PROVISIONING_QUEUE_URL = "my url";
    await handler(withResponse, {} as Context);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
    expect(
      sqsMock.commandCalls(SendMessageCommand, { QueueUrl: "my url", MessageBody: JSON.stringify(withResponse) }, true)
    ).toHaveLength(1);
  });
});
