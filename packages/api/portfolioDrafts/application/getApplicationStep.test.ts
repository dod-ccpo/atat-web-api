import { APIGatewayProxyEvent } from "aws-lambda";
// import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ErrorCodes } from "../../models/Error";
import { ErrorStatusCode } from "../../utils/response";
import { handler } from "./getApplicationStep";
// import { mockClient } from "aws-sdk-client-mock";
import { PATH_VARIABLE_REQUIRED_BUT_MISSING } from "../../utils/errors";
import { v4 as uuid } from "uuid";

const mockPortfolioDraftId = uuid();
const normalRequest: APIGatewayProxyEvent = {
  body: "",
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const missingPathVariableRequest: APIGatewayProxyEvent = {
  body: "",
  pathParameters: {}, // missing portfolioDraftId
} as any;

describe("TODO list", function () {
  it.todo("should return http status 200 on happy path");
  it.todo("should return http status 404 when Application Step not found the given Portfolio Draft");
  it.todo("should return http status 404 when the given Portfolio Draft does not exist");
});

describe("when handler() does not receive required parameter 'portfolioDraftId'", function () {
  it("should return error response PATH_VARIABLE_REQUIRED_BUT_MISSING", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(response).toEqual(PATH_VARIABLE_REQUIRED_BUT_MISSING);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Required path variable is missing'", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(JSON.parse(response.body).message).toEqual("Required path variable is missing");
  });
});
