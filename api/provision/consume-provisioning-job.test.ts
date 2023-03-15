import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { generateMockMessageResponses, requestContext } from "../util/common-test-fixtures";
import { handler } from "./consume-provisioning-job";

// This is standing in for the SQS queue content.
// The number of messages and message content are irrelevant
// excepting that it cannot be empty.
const messageBodies = [
  {
    foo: "foo",
  },
  {
    bar: "bar",
  },
];
const mockReceiveMessageResponse = generateMockMessageResponses(messageBodies);
// Each entry of messageBodies is expanded to a message element
// under the object key 'Messages' similar to the following:
// {
//   MessageId: 'b5353c',
//   ReceiptHandle: 'AQC0e6b=',
//   MD5OfBody: '53c0a94739bbb505b458e55096ea85bf',
//   Body: '{"foo":"foo"}',
//   Attributes: undefined,
//   MD5OfMessageAttributes: undefined,
//   MessageAttributes: undefined
// },

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

describe("Consume Provisioning Job handler - normal SQS behavior", () => {
  it("should poll non-empty queue and return 200 status and expected number of messages", async () => {
    // object key Messages is based on messageBodies to simulate a non-empty queue
    const sqsMockResponse = mockReceiveMessageResponse;
    expect(sqsMockResponse.$metadata).toBeDefined();
    expect(sqsMockResponse.Messages).toBeDefined();
    expect(sqsMockResponse.Messages).toHaveLength(messageBodies.length);
    sqsMock.on(ReceiveMessageCommand).resolves(sqsMockResponse);

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);
    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(sqsMockResponse.Messages.length);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toBe(SuccessStatusCode.OK);
    expect(JSON.parse(response.body)).toEqual(messageBodies);
  });
  it("should poll empty queue and return 200 status and no messages", async () => {
    // object key Messages is overridden with undefined to simulate an empty queue
    const sqsMockResponse = { ...mockReceiveMessageResponse, Messages: undefined };
    expect(sqsMockResponse.$metadata).toBeDefined();
    expect(sqsMockResponse.Messages).toBeUndefined();
    sqsMock.on(ReceiveMessageCommand).resolves(sqsMockResponse);

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);
    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toBe(SuccessStatusCode.OK);

    const responseBody = JSON.parse(response.body);
    expect(responseBody).toHaveLength(0);
    expect(responseBody).toEqual([]);
  });
});

describe("Consume Provisioning Job handler - abnormal SQS behavior", () => {
  it("should poll an abnormally behaving queue and return 500 status", async () => {
    // simulate abnormal queue behavior; no object in the response, no $metadata nor Messages keys
    sqsMock.on(ReceiveMessageCommand).resolves(undefined!);

    const response = await handler({ body: null, requestContext } as APIGatewayProxyEvent, {} as Context);

    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
