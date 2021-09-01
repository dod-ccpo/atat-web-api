import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { handler, NO_PORTFOLIO_PATH_PARAM, NO_SUCH_PORTFOLIO } from "./getPortfolioDraft";
import { DATABASE_ERROR } from "../utils/errors";
import { ErrorStatusCode, SuccessStatusCode } from "../utils/response";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  pathParameters: { portfolioDraftId: "1234" },
} as any;

describe("Validation tests", function () {
  it("should require path param", async () => {
    const emptyRequest: APIGatewayProxyEvent = {} as any;
    expect(await handler(emptyRequest)).toEqual(NO_PORTFOLIO_PATH_PARAM);
  });

  it("should return error if portfolio ID does not exist", async () => {
    const response: GetCommandOutput = {} as any;
    ddbMock.on(GetCommand).resolves(response);
    expect(await handler(validRequest)).toEqual(NO_SUCH_PORTFOLIO);
  });

  it("should return generic Error if exception caught", async () => {
    ddbMock.on(GetCommand).rejects("Some error occurred");
    expect(await handler(validRequest)).toEqual(DATABASE_ERROR);
  });
});

describe("Happy Path tests", function () {
  const item = { foo: "bar" };

  beforeEach(() => {
    ddbMock.on(GetCommand).resolves({
      Item: item,
    });
  });

  it("should return Item", async () => {
    const result = await handler(validRequest);
    expect(result.body).toEqual(JSON.stringify(item));
  });
  it("should return status code 200", async () => {
    const result = await handler(validRequest);
    expect(result.statusCode).toEqual(SuccessStatusCode.OK);
  });
});
