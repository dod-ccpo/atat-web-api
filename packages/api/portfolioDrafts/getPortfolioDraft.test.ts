import { APIGatewayProxyEvent } from "aws-lambda";
import { Application } from "../models/Application";
import { DATABASE_ERROR } from "../utils/errors";
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { handler, NO_PORTFOLIO_PATH_PARAM, NO_SUCH_PORTFOLIO } from "./getPortfolioDraft";
import { mockClient } from "aws-sdk-client-mock";
import { mockPortfolioDraft, validRequest } from "./commonPortfolioDraftMockData";
import { SuccessStatusCode } from "../utils/response";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Validation tests", () => {
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

describe("Successful operation tests", () => {
  beforeEach(() => {
    ddbMock.on(GetCommand).resolves({
      Item: mockPortfolioDraft,
    });
  });
  it("should return Item", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toStrictEqual(mockPortfolioDraft);
  });
  it("should return status code 200", async () => {
    const result = await handler(validRequest);
    expect(result.statusCode).toEqual(SuccessStatusCode.OK);
  });
  it("should return portfolio draft with correct portfolio name", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.name).toBe(mockPortfolioDraft.portfolio_step.name);
  });
  it("should return portfolio draft with correct number of portfolio managers", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(mockPortfolioDraft.num_portfolio_managers).toBe(responseBody.portfolio_step.portfolio_managers.length);
  });
  it("should return portfolio draft with correct number of task orders", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(mockPortfolioDraft.num_task_orders).toBe(responseBody.funding_step.task_orders.length);
  });
  it("should return portfolio draft with correct number of applications", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(mockPortfolioDraft.num_applications).toBe(responseBody.application_step.applications.length);
  });
  it("should return portfolio draft with correct number of environments", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(mockPortfolioDraft.num_environments).toBe(
      responseBody.application_step.applications.flatMap((app: Application) => app.environments).length
    );
  });
});
