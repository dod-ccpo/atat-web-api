import MockAdapter from "axios-mock-adapter";
import { AtatClient } from "./client";
import {
  CostResponseByPortfolio,
  AddPortfolioRequest,
  AddPortfolioResponseAsync,
  AddPortfolioResponseSync,
  GetCostsByPortfolioResponse,
  Portfolio,
  ProvisioningStatus,
  ProvisioningStatusType,
} from "./types";

const TEST_API_TOKEN = "TEST-TOKEN-NOT-REAL";
const TEST_CSP_ENDPOINT = "https://localhost/atat/api/v1";

describe("addPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const portfolio: Portfolio = {
    name: "Test Portfolio",
    taskOrders: [],
    administrators: [],
  };
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT });
    // This is necessary to mock the specific instance of Axios. Perhaps we could instead
    // change the constructor to accept an optional axios instance or do something more
    // creative here. But for the time being, bypassing the visibilty check and directly
    // relying on this implementation details feels acceptable for an internal test.
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios`).reply(200, portfolio, { "Content-Type": "application/json" });
    const result = (await client.addPortfolio({ portfolio })) as AddPortfolioResponseSync;
    expect(mock.history.post[0].url).toEqual(`/portfolios`);
    expect(result.portfolio).toEqual(portfolio);
  });
  it("should handle a successful 202 response", async () => {
    const status: ProvisioningStatus = {
      status: ProvisioningStatusType.IN_PROGRESS,
      portfolioId: "test-portfolio-id",
      provisioningJobId: "test-job-id",
    };
    const location = "https://localhost/atat/api/v1/provisioning-jobs/test-job-id";
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios`).reply(202, status, { "Content-Type": "application/json", location });
    const result = (await client.addPortfolio({ portfolio })) as AddPortfolioResponseAsync;
    expect(mock.history.post[0].url).toEqual(`/portfolios`);
    expect(result.status).toEqual(status);
    expect(result.location).toEqual(location);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios`).reply(400, { bad: "request" });
    expect(async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)).rejects.toThrow(
      /Invalid portfolio provided/
    );
  });
  it.each([204, 500, 405, 404, 410, 503])(
    "should throw an error on any unexpected response (ex: %s)",
    async (statusCode) => {
      mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios`).reply(statusCode, { bad: "request" });
      expect(async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)).rejects.toThrow(
        /Unexpected API error/
      );
    }
  );
});

describe("getCostsByPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT });
    // This is necessary to mock the specific instance of Axios. Perhaps we could instead
    // change the constructor to accept an optional axios instance or do something more
    // creative here. But for the time being, bypassing the visibilty check and directly
    // relying on this implementation details feels acceptable for an internal test.
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    const portfolioId = "test-portfolio-id";
    const costData: CostResponseByPortfolio = {
      taskOrders: [
        {
          taskOrderNumber: "1234567891234",
          clins: [
            {
              clinNumber: "0001",
              actual: [
                {
                  total: "50.00",
                  results: [
                    {
                      month: "2021-12",
                      value: "20.00",
                    },
                    {
                      month: "2022-01",
                      value: "30.00",
                    },
                  ],
                },
              ],
              forecast: [
                {
                  total: "100.00",
                  results: [
                    {
                      month: "2022-02",
                      value: "100.00",
                    },
                  ],
                },
              ],
            },
            {
              clinNumber: "0002",
              actual: [
                {
                  total: "750.00",
                  results: [
                    {
                      month: "2021-12",
                      value: "50.00",
                    },
                    {
                      month: "2022-01",
                      value: "700.00",
                    },
                  ],
                },
              ],
              forecast: [
                {
                  total: "1000.00",
                  results: [
                    {
                      month: "2022-02",
                      value: "100.00",
                    },
                    {
                      month: "2022-03",
                      value: "900.00",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    mock.onGet(`/portfolios/${portfolioId}/cost`).reply(200, costData);
    const result = (await client.getCostsByPortfolio({
      portfolioId,
      startDate: "2021-12-01",
      endDate: "2022-03-31",
    })) as GetCostsByPortfolioResponse;
    expect(mock.history.get[0].url).toEqual(`/portfolios/${portfolioId}/cost`);
    expect(mock.history.get[0].params).toEqual({ start_date: "2021-12-01", end_date: "2022-03-31" });
    expect(result.costs).toEqual(costData);
  });
});
