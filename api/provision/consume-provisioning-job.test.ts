import { handler } from "./consume-provisioning-job";
import { SQSEvent, Context, APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import * as crypto from "crypto";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { requestContext } from "./start-provisioning-job.test";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";

export const mockReceiveMessageResponse = {
  $metadata: {
    httpStatusCode: 200,
    requestId: "74b3f95",
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
  Messages: [
    {
      MessageId: "b5353c",
      ReceiptHandle: "AQC0e6b=",
      MD5OfBody: "b03",
      Body: JSON.stringify({
        jobId: "81b31",
        cspResponse: { ExecutedVersion: "$LATEST", Payload: { code: 200, content: { some: "good content" } } },
      }),
      Attributes: undefined,
      MD5OfMessageAttributes: undefined,
      MessageAttributes: undefined,
    },
    {
      MessageId: "330d3d",
      ReceiptHandle: "AQECbOFf=",
      MD5OfBody: "3ae8",
      Body: JSON.stringify({
        jobId: "81b317",
        cspResponse: { ExecutedVersion: "$LATEST", Payload: { code: 400, content: { some: "bad content" } } },
      }),
      Attributes: undefined,
      MD5OfMessageAttributes: undefined,
      MessageAttributes: undefined,
    },
  ],
};

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

describe("Consumer Provisioning Job handler valid behavior", () => {
  it("should poll 2 messages from SQS provisioning queue with 200", async () => {
    process.env.PROVISIONING_QUEUE_URL = "my url";
    sqsMock.on(ReceiveMessageCommand).resolves(mockReceiveMessageResponse);

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);
    const responseBody = JSON.parse(response.body);

    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(2);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toBe(SuccessStatusCode.OK);
    expect(responseBody).toHaveLength(2);
    expect(responseBody).toEqual(
      mockReceiveMessageResponse.Messages.map((message) => {
        const body = JSON.parse(message.Body);
        return { jobId: body.jobId, cspResponse: body.cspResponse.Payload };
      })
    );
  });
  it("should poll 0 messages and return empty array with 200", async () => {
    process.env.PROVISIONING_QUEUE_URL = "my url";
    sqsMock.on(ReceiveMessageCommand).resolves({ ...mockReceiveMessageResponse, Messages: undefined });

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);
    const responseBody = JSON.parse(response.body);

    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toBe(SuccessStatusCode.OK);
    expect(responseBody).toHaveLength(0);
    expect(responseBody).toEqual([]);
  });
});

describe("Consumer Provisioning Job invalid behavior", () => {
  it("should throw an internal error if invalid response from queue", async () => {
    process.env.PROVISIONING_QUEUE_URL = "my url";
    sqsMock.on(ReceiveMessageCommand).resolves(undefined!);

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);
    const responseBody = JSON.parse(response.body);

    console.log("TEST: ", responseBody);
    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
