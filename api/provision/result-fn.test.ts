import { Context } from "aws-lambda";
import { handler } from "./result-fn";
import { mockClient } from "aws-sdk-client-mock";
import { ValidationErrorResponse } from "../../utils/response";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { provisioningBodyWithPayload } from "./start-provision-job.test";

const sqsMock = mockClient(sqsClient);

const withResponse = {
  ...provisioningBodyWithPayload,
  cspResponse: {
    code: "200",
    content: {},
  },
};

beforeEach(() => {
  sqsMock.reset();
});

describe("Validate input", () => {
  it("should accept input with cspResponse", async () => {
    const response = await handler(withResponse, {} as Context);
    console.log(response);
    expect(response).not.toBeInstanceOf(ValidationErrorResponse);
  });
});

describe("Validate behavior", () => {
  it("should return the complete step fn state", async () => {
    const response = await handler(withResponse, {} as Context);
    expect(response).toEqual(
      expect.objectContaining({
        ...withResponse,
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
