import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "./submitPortfolioDraft";
import { mockClient } from "aws-sdk-client-mock";
import {
  NO_SUCH_PORTFOLIO_DRAFT_404,
  REQUEST_BODY_NOT_EMPTY,
  PORTFOLIO_ALREADY_SUBMITTED,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  DATABASE_ERROR,
} from "../../utils/errors";
import { validRequest } from "../commonPortfolioDraftMockData";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Validation tests", () => {
  it("should require path param", async () => {
    const emptyRequest: APIGatewayProxyEvent = {} as any;
    expect(await handler(emptyRequest)).toEqual(PATH_PARAMETER_REQUIRED_BUT_MISSING);
  });

  it("should return generic Error if exception caught", async () => {
    ddbMock.on(GetCommand).rejects("Some error occurred");
    expect(await handler(validRequest)).toEqual(DATABASE_ERROR);
  });

  it("should return REQUEST_BODY_NOT_EMPTY when request body is not empty", async () => {
    const requestBodyShouldBeEmpty = {
      hi: "This should be empty",
    };
    const request: APIGatewayProxyEvent = {
      ...validRequest,
      body: JSON.stringify(requestBodyShouldBeEmpty),
    } as any;

    const response = await handler(request);
    expect(response).toEqual(REQUEST_BODY_NOT_EMPTY);
  });
});
describe("Handler response with mock dynamodb", () => {
  it("should return error when the submitPortfolioDraftCommand fails, and portfolioDraft exists", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    ddbMock.on(GetCommand).resolves({
      Item: {},
    });
    expect(await handler(validRequest)).toEqual(PORTFOLIO_ALREADY_SUBMITTED);
  });
  it("should return error when the submitPortfolioDraftCommand fails, and portfolioDraft doesn't exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    ddbMock.on(GetCommand).resolves({}); // resolves, but doesn't include an Item (!results.Item)
    expect(await handler(validRequest)).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
  });
});
