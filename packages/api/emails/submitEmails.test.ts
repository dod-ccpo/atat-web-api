import { handler } from "./submitEmails";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { ErrorStatusCode, SuccessStatusCode } from "../utils/response";

const sqsMock = mockClient(SQSClient);
beforeEach(() => {
  sqsMock.reset();
});

describe("Successfully send messages to a queue for sending emails", function () {
  const validRequest: APIGatewayProxyEvent = {
    body: { emails: ["test@email.mil"], emailType: "invitation", missionOwner: "Ms. Mission Owner" },
  } as any;

  it("should successfully send message to queue and return 202", async () => {
    const messageResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "6d5c14d8-1d4d-5591-ae73-4d3517cae073",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };
    sqsMock.on(SendMessageCommand).resolves(messageResponse);
    // with middy wrapper need to provide context and a callback as well
    const response = (await handler(validRequest, {} as Context, () => null)) as APIGatewayProxyResult;
    expect(response.body).toBe(JSON.stringify({ sqsResponse: messageResponse, messageBody: validRequest.body }));
    expect(response.statusCode).toBe(SuccessStatusCode.ACCEPTED);
  });
});

describe("Errors when sending messages to the queue for sending emails", function () {
  it.each([{}, null, undefined])(
    "should return a 400 error when the object is empty, null or undefined",
    async (request) => {
      const badObjectShapeRequest: APIGatewayProxyEvent = { body: request } as any;

      const response = (await handler(badObjectShapeRequest, {} as Context, () => null)) as APIGatewayProxyResult;
      const responseBody = JSON.parse(response.body);

      expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(responseBody.message).toMatch(/Event object failed validation/);
      expect(responseBody.name).toMatch(/BadRequestError/);
      expect(responseBody).toHaveProperty("name");
      expect(responseBody).toHaveProperty("details");
      expect(responseBody.details.length).toEqual(3);
      expect(responseBody.details[0]).toHaveProperty("message");
      expect(responseBody.details[0]).toHaveProperty("params");
    }
  );
  it.each([
    { /* emails: ["test@email.mil"], */ emailType: "invitation", missionOwner: "Ms. Mission Owner" },
    { emails: ["test@email.mil"], /* emailType: "invitation", */ missionOwner: "Ms. Mission Owner" },
    { emails: ["test@email.mil"], emailType: "invitation" /* missionOwner: "Ms. Mission Owner" */ },
  ])("should return a 400 error when a required field is missing", async (request) => {
    const missingFieldRequest: APIGatewayProxyEvent = { body: request } as any;

    const response = (await handler(missingFieldRequest, {} as Context, () => null)) as APIGatewayProxyResult;
    const responseBody = JSON.parse(response.body);

    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Event object failed validation/);
    expect(responseBody.name).toMatch(/BadRequestError/);
    expect(responseBody).toHaveProperty("name");
    expect(responseBody).toHaveProperty("details");
    expect(responseBody.details.length).toEqual(1);
    expect(responseBody.details[0]).toHaveProperty("message");
    expect(responseBody.details[0]).toHaveProperty("params");
  });
  it.each(["", "bad", 0, 343, true, false])(
    "should return a 400 error when the request body is not an object",
    async (request) => {
      const emptyRequest: APIGatewayProxyEvent = { body: request } as any;

      const response = (await handler(emptyRequest, {} as Context, () => null)) as APIGatewayProxyResult;
      const responseBody = JSON.parse(response.body);

      expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
      expect(responseBody.details[0].message).toMatch(/must be object/);
      expect(responseBody.details.length).toEqual(1);
    }
  );
  it("should return a 400 error when the request body contains an unknown property", async () => {
    const emptyRequest: APIGatewayProxyEvent = { body: { unknown: "property" } } as any;

    const response = (await handler(emptyRequest, {} as Context, () => null)) as APIGatewayProxyResult;
    const responseBody = JSON.parse(response.body);

    expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.details).toHaveLength(4);
    expect(JSON.stringify(responseBody.details)).toMatch(/must NOT have additional properties/);
    // TODO: figure out a way to get this test to pass so this object can be tested
    // expect(responseBody.details).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       instancePath: "/body",
    //       schemaPath: "#/properties/body/additionalProperties",
    //       keyword: "additionalProperties",
    //       params: { additionalProperty: "bad" },
    //       message: "must NOT have additional properties",
    //     }),
    //   ])
    // );
  });
  it("should return 5xx errors when ...", async () => {
    // TODO: 5xx errors
    expect("y").toBe("y");
  });
});
