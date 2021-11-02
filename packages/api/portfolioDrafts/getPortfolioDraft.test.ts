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
  const portfolioSummaryAttributes = [
    "id",
    "status",
    "name",
    "num_portfolio_managers",
    "portfolio_step",
    "funding_step",
    "num_task_orders",
    "num_applications",
    "num_environments",
  ];

  it("should return Item", async () => {
    const result = await handler(validRequest);
    expect(result.body).toStrictEqual(JSON.stringify(mockPortfolioDraft));
  });
  it("should return status code 200", async () => {
    const result = await handler(validRequest);
    expect(result.statusCode).toEqual(SuccessStatusCode.OK);
  });
  // NOTE: this test assumes all steps of the portfolio draft summary are completed
  it.each(portfolioSummaryAttributes)("should have all attributes for portfolio summary", async (attribute) => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty(attribute);
  });
  it("should return portfolio summary with correct attribute value", async () => {
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    const numOfPortfolioManagers: number = responseBody.portfolio_step.portfolio_managers.length;
    const numOfApplications: number = responseBody.application_step.applications.length;
    const numOfEnvironments: number = responseBody.application_step.applications.flatMap(
      (app: Application) => app.environments
    ).length;
    const numOfTaskOrders: number = responseBody.funding_step.task_orders.length;

    expect(responseBody.name).toBe(mockPortfolioDraft.portfolio_step.name);
    expect(numOfPortfolioManagers).toBe(mockPortfolioDraft.num_portfolio_managers);
    expect(numOfApplications).toBe(mockPortfolioDraft.num_applications);
    expect(numOfEnvironments).toBe(mockPortfolioDraft.num_environments);
    expect(numOfTaskOrders).toBe(mockPortfolioDraft.num_task_orders);
  });
});
