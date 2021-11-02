import { APIGatewayProxyEvent } from "aws-lambda";
import { Application } from "../models/Application";
import { CloudServiceProvider } from "../models/CloudServiceProvider";
import { DATABASE_ERROR } from "../utils/errors";
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { FundingStep } from "../models/FundingStep";
import { handler, NO_PORTFOLIO_PATH_PARAM, NO_SUCH_PORTFOLIO } from "./getPortfolioDraft";
import { mockApplicationStep } from "./application/commonApplicationMockData";
import { mockClient } from "aws-sdk-client-mock";
import { PortfolioDraft } from "../models/PortfolioDraft";
import { PortfolioStep } from "../models/PortfolioStep";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import { SuccessStatusCode } from "../utils/response";
import { validRequest } from "./commonPortfolioDraftMockData";

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
      Item: mockPortfolioDraftSummaryGoodData(),
    });
  });
  const goodMockResponse: PortfolioDraft = mockPortfolioDraftSummaryGoodData();
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
    expect(result.body).toStrictEqual(JSON.stringify(goodMockResponse));
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

    expect(responseBody.name).toBe(goodMockResponse.portfolio_step?.name);
    expect(numOfPortfolioManagers).toBe(goodMockResponse.num_portfolio_managers);
    expect(numOfApplications).toBe(goodMockResponse.num_applications);
    expect(numOfEnvironments).toBe(goodMockResponse.num_environments);
    expect(numOfTaskOrders).toBe(goodMockResponse.num_task_orders);
  });
});

describe("Incorrect number of attributes for portfolio draft summary", () => {
  it("should return falsy for incorrect attributes ", async () => {
    const badMockResponse: PortfolioDraft = mockPortfolioDraftSummaryBadData();
    ddbMock.on(GetCommand).resolves({
      Item: mockPortfolioDraftSummaryBadData(),
    });

    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    const numOfTaskOrders: number = responseBody.funding_step.task_orders.length;
    const numOfPortfolioManagers: number = responseBody.portfolio_step.portfolio_managers.length;
    const numOfApplications: number = responseBody.application_step.applications.length;
    const numOfEnvironments: number = responseBody.application_step.applications.flatMap(
      (app: Application) => app.environments
    ).length;

    expect(responseBody.portfolio_name).not.toBe(badMockResponse.portfolio_step?.name);
    expect(numOfPortfolioManagers).not.toBe(badMockResponse.num_portfolio_managers);
    expect(numOfTaskOrders).not.toBe(badMockResponse.num_task_orders);
    expect(numOfApplications).not.toBe(badMockResponse.num_applications);
    expect(numOfEnvironments).not.toBe(badMockResponse.num_environments);
  });
});

/**
 * Sample Portfolio Draft Summary with good data
 * @returns a complete Portfolio Draft Summary with good data that should not cause errors
 */
function mockPortfolioDraftSummaryGoodData(): PortfolioDraft {
  return {
    id: "41ec495a-6fec-46f1-a4e5-5be6332f4115",
    updated_at: "2021-09-15T00:15:40.076Z",
    created_at: "2021-09-15T00:10:52.400Z",
    status: ProvisioningStatus.NOT_STARTED,
    name: "Coolest Portfolio",
    description: "Coolest portfolio description",
    portfolio_step: mockPortfolioStep(),
    num_portfolio_managers: 4,
    application_step: mockApplicationStep,
    num_applications: 2,
    num_environments: 3,
    funding_step: mockFundingStep(),
    num_task_orders: 2,
  };
}

/**
 * Sample Portfolio Draft Summary with bad data
 * @returns a complete Portfolio Draft Summary with good data that should not cause errors
 */
function mockPortfolioDraftSummaryBadData(): PortfolioDraft {
  return {
    id: "41ec495a-6fec-46f1-a4e5-5be6332f4115",
    updated_at: "2021-09-15T00:15:40.076Z",
    created_at: "2021-09-15T00:10:52.400Z",
    status: ProvisioningStatus.NOT_STARTED,
    name: "Crazy Portfolio",
    description: "Crazy portfolio description",
    portfolio_step: mockPortfolioStep(),
    num_portfolio_managers: 77,
    application_step: mockApplicationStep,
    num_applications: 99,
    num_environments: 124,
    funding_step: mockFundingStep(),
    num_task_orders: 22,
  };
}

/**
 * Portfolio Step
 * @returns a valid portfolio step
 */
function mockPortfolioStep(): PortfolioStep {
  return {
    name: "Coolest Portfolio",
    csp: CloudServiceProvider.CSP_A,
    description: "Description of something cool",
    portfolio_managers: ["coolIdea@example.com", "coolPerson@example.com", "support@example.com", "admin@example.com"],
    dod_components: ["space_force"],
  };
}

/**
 * Funding Step
 * @returns a valid funding step
 */
function mockFundingStep(): FundingStep {
  return {
    task_orders: [
      {
        task_order_file: {
          name: "TO_1234567890.pdf",
          id: "b91db32f-40fa-4225-9885-b032f0d229fe",
        },
        clins: [
          {
            idiq_clin: "1010",
            clin_number: "0100",
            pop_start_date: "2021-07-01",
            pop_end_date: "2022-07-01",
            total_clin_value: 100000,
            obligated_funds: 1,
          },
        ],
        task_order_number: "1234567890",
      },
      {
        task_order_file: {
          name: "TO_0987654321",
          id: "73fdb32f-40fa-4225-9885-b032f0d229fe",
        },
        clins: [
          {
            idiq_clin: "1010",
            clin_number: "0100",
            pop_start_date: "2021-05-01",
            pop_end_date: "2022-06-01",
            total_clin_value: 200000,
            obligated_funds: 100,
          },
        ],
        task_order_number: "0987654321",
      },
    ],
  };
}
