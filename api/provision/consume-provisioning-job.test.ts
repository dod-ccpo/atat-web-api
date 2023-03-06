import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { generateMockMessageResponses, requestContext } from "../util/common-test-fixtures";
import { handler } from "./consume-provisioning-job";

const messageBodies = [
  {
    code: 200,
    content: {
      some: "good content",
    },
  },
  {
    code: 400,
    content: {
      some: "bad content",
    },
  },
];
const mockReceiveMessageResponse = generateMockMessageResponses(messageBodies);

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
        return { code: body.code, content: body.content };
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

    expect(sqsMock.commandCalls(ReceiveMessageCommand)).toHaveLength(1);
    expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(0);
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
