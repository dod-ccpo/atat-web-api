import MockAdapter from "axios-mock-adapter";
import { AtatClient } from "./client";
import {
  administrators,
  environmentId,
  location,
  mockAddTaskOrderRequest,
  mockCostData,
  mockGetCostsByClinRequest,
  mockPatchEnvironmentRequest,
  mockPortfolio,
  mockProvisioningStatus,
  mockTaskOrder,
  portfolioId,
  provisioningJobId,
  TEST_CSP_ENDPOINT,
} from "./fixtures";
import {
  AddEnvironmentRequest,
  AddEnvironmentResponseAsync,
  AddEnvironmentResponseSync,
  AddPortfolioRequest,
  AddPortfolioResponseSync,
  AddTaskOrderRequest,
  AddTaskOrderResponseSync,
  ClassificationLevel,
  CostResponseByClin,
  Environment,
  GetCostsByClinRequest,
  GetCostsByClinResponse,
  GetCostsByPortfolioRequest,
  GetCostsByPortfolioResponse,
  GetPortfolioRequest,
  GetPortfolioResponse,
  GetProvisioningStatusRequest,
  GetProvisioningStatusResponse,
  PatchEnvironmentRequest,
  PatchEnvironmentResponseSync,
  Portfolio,
} from "./types";

const TEST_API_TOKEN = "TEST-TOKEN-NOT-REAL";

describe("addPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const portfolio: Portfolio = {
    name: "Test Portfolio",
    taskOrders: [],
  };
  const url = `${TEST_CSP_ENDPOINT}/portfolios`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // This is necessary to mock the specific instance of Axios. Perhaps we could instead
    // change the constructor to accept an optional axios instance or do something more
    // creative here. But for the time being, bypassing the visibility check and directly
    // relying on this implementation details feels acceptable for an internal test.
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    mock.onPost(url).reply(200, portfolio, { "Content-Type": "application/json" });
    const result = (await client.addPortfolio({ portfolio })) as AddPortfolioResponseSync;
    expect(mock.history.post[0].url).toEqual(`/portfolios`);
    expect(result.portfolio).toEqual(portfolio);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onPost(url).reply(400, { bad: "request" });
    await expect(
      async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)
    ).rejects.toThrow(/Invalid portfolio provided/);
  });
  it.each([204, 500, 405, 404, 410, 503])(
    "should throw an error on any unexpected response (ex: %s)",
    async (statusCode) => {
      mock.onPost(url).reply(statusCode, { bad: "request" });
      await expect(
        async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)
      ).rejects.toThrow(/Unexpected API error/);
    }
  );
});

describe("getPortfolioById", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}`;
  const portfolio: Portfolio = {
    ...mockPortfolio,
    id: portfolioId,
  };
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response and return a portfolio", async () => {
    mock.onGet(url).reply(200, portfolio);
    const result = (await client.getPortfolioById({
      portfolioId,
    })) as GetPortfolioResponse;
    expect(mock.history.get[0].url).toEqual(`/portfolios/${portfolioId}`);
    expect(result.portfolio).toEqual(portfolio);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onGet(`portfolios/undefined`).reply(400, { bad: "request" });
    await expect(
      async () => await client.getPortfolioById({ bad: "input" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Invalid ID supplied/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(`portfolios/undefined`).reply(404, { not: "found" });
    await expect(
      async () => await client.getPortfolioById({ not: "found" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`portfolios/undefined`).reply(statusCode, { unknown: "error thrown" });
    await expect(
      async () => await client.getPortfolioById({ unexpected: "error" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});
describe("addEnvironment", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const environment: Environment = {
    name: "Test Environment",
    administrators: [],
    classificationLevel: ClassificationLevel.UNCLASSIFIED,
  };
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/environments`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // This is necessary to mock the specific instance of Axios. Perhaps we could instead
    // change the constructor to accept an optional axios instance or do something more
    // creative here. But for the time being, bypassing the visibility check and directly
    // relying on this implementation details feels acceptable for an internal test.
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    mock.onPost(url).reply(200, environment, { "Content-Type": "application/json" });
    const result = (await client.addEnvironment({
      portfolioId,
      environment,
    })) as AddEnvironmentResponseSync;
    expect(mock.history.post[0].url).toEqual(`/portfolios/${portfolioId}/environments`);
    expect(result.environment).toEqual(environment);
  });
  it("should handle a successful 202 response", async () => {
    mock.onPost(url).reply(202, mockProvisioningStatus, { "Content-Type": "application/json", location });
    const result = (await client.addEnvironment({
      portfolioId,
      environment,
    })) as AddEnvironmentResponseAsync;
    expect(mock.history.post[0].url).toEqual(`/portfolios/${portfolioId}/environments`);
    expect(result.status).toEqual(mockProvisioningStatus);
    expect(result.location).toEqual(location);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onPost(url).reply(400, { bad: "request" });
    await expect(
      async () => await client.addEnvironment({ bad: "input", portfolioId } as unknown as AddEnvironmentRequest)
    ).rejects.toThrow(/Invalid environment provided/);
  });
  it.each([204, 500, 405, 404, 410, 503])(
    "should throw an error on any unexpected response (ex: %s)",
    async (statusCode) => {
      mock.onPost(url).reply(statusCode, { bad: "request" });
      await expect(
        async () => await client.addEnvironment({ bad: "input", portfolioId } as unknown as AddEnvironmentRequest)
      ).rejects.toThrow(/Unexpected API error/);
    }
  );
});

// TODO: Implement updates to refactor patch operation from portfolios to environments and re-enable this suite
describe.skip("patchEnvironment", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/environments/${environmentId}`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response for patching environment details", async () => {
    const request: PatchEnvironmentRequest = {
      ...mockPatchEnvironmentRequest,
      provisionDeadline: "2022-11-15",
      portfolioId,
    };
    mock.onPatch(url).reply(200, { patch: administrators });
    const result = (await client.patchEnvironment(request)) as PatchEnvironmentResponseSync;
    expect(mock.history.patch[0].url).toEqual(`/portfolios/${portfolioId}/environments/${environmentId}`);
    expect(result.patch).toEqual({ patch: administrators });
  });

  it("should throw a 400 error", async () => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(400, { bad: "request" });
    await expect(
      async () =>
        await client.patchEnvironment({
          bad: "input",
          portfolioId,
          environmentId,
        } as unknown as PatchEnvironmentRequest)
    ).rejects.toThrow(/Invalid portfolio provided/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(404, { not: "found" });
    await expect(
      async () =>
        await client.patchEnvironment({
          not: "found",
          portfolioId,
          environmentId,
        } as unknown as PatchEnvironmentRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(statusCode, { unknown: "error thrown" });
    await expect(
      async () =>
        await client.patchEnvironment({
          unknown: "error",
          portfolioId,
          environmentId,
        } as unknown as PatchEnvironmentRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("getCostsByPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/cost`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    mock.onGet(url).reply(200, mockCostData);
    const result = (await client.getCostsByPortfolio({
      portfolioId,
      startDate: "2021-12-01",
      endDate: "2022-03-31",
    })) as GetCostsByPortfolioResponse;
    expect(mock.history.get[0].url).toEqual(`/portfolios/${portfolioId}/cost`);
    expect(mock.history.get[0].params).toEqual({ start_date: "2021-12-01", end_date: "2022-03-31" });
    expect(result.costs).toEqual(mockCostData);
  });
  it("should throw a 400 error", async () => {
    mock.onGet(`${TEST_CSP_ENDPOINT}/portfolios/undefined/cost`).reply(400, { bad: "request" });
    await expect(
      async () => await client.getCostsByPortfolio({ bad: "input" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Invalid ID or query parameters/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(`${TEST_CSP_ENDPOINT}/portfolios/undefined/cost`).reply(404, { not: "found" });
    await expect(
      async () => await client.getCostsByPortfolio({ not: "found" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`${TEST_CSP_ENDPOINT}/portfolios/undefined/cost`).reply(statusCode, { unknown: "error thrown" });
    await expect(
      async () => await client.getCostsByPortfolio({ unknown: "error" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("addTaskOrder", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/task-orders`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    mock.onPost(url).reply(200, mockTaskOrder);
    const result = (await client.addTaskOrder(mockAddTaskOrderRequest)) as AddTaskOrderResponseSync;
    expect(mock.history.post[0].url).toEqual(`/portfolios/${portfolioId}/task-orders`);
    expect(result.taskOrder).toEqual(mockTaskOrder);
  });
  it("should throw a 400 error", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(400, { bad: "request" });
    await expect(
      async () => await client.addTaskOrder({ bad: "input" } as unknown as AddTaskOrderRequest)
    ).rejects.toThrow(/Invalid ID supplied/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(404, { not: "found" });
    await expect(
      async () => await client.addTaskOrder({ not: "found" } as unknown as AddTaskOrderRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(statusCode, { unknown: "error thrown" });
    await expect(
      async () => await client.addTaskOrder({ unknown: "error" } as unknown as AddTaskOrderRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("getCostsByClin", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const taskOrderNumber = mockTaskOrder.taskOrderNumber;
  const clin = mockTaskOrder.clins[0].clinNumber;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/task-orders/${taskOrderNumber}/clins/${clin}/cost`;
  const badUrl = `${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders/undefined/clins/undefined/cost`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    const mockClinCosts: CostResponseByClin = {
      actual: mockCostData.taskOrders[0].clins[0].actual,
      forecast: mockCostData.taskOrders[0].clins[0].forecast,
    };
    mock.onGet(url).reply(200, mockClinCosts);
    const result = (await client.getCostsByClin(mockGetCostsByClinRequest)) as GetCostsByClinResponse;
    expect(mock.history.get[0].url).toEqual(
      `/portfolios/${portfolioId}/task-orders/${taskOrderNumber}/clins/${clin}/cost`
    );
    expect(result.costs).toEqual(mockClinCosts);
  });
  it("should throw a 400 error", async () => {
    mock.onGet(badUrl).reply(400, { bad: "request" });
    await expect(
      async () => await client.getCostsByClin({ bad: "input" } as unknown as GetCostsByClinRequest)
    ).rejects.toThrow(/Invalid ID or query parameters/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(badUrl).reply(404, { not: "found" });
    await expect(
      async () => await client.getCostsByClin({ not: "found" } as unknown as GetCostsByClinRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(badUrl).reply(statusCode, { unknown: "error thrown" });
    await expect(
      async () => await client.getCostsByClin({ unknown: "error" } as unknown as GetCostsByClinRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("getProvisioningStatus", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  // the url is the location used for finding the status
  const url = `${TEST_CSP_ENDPOINT}/provisioning/${provisioningJobId}/status`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, TEST_CSP_ENDPOINT);
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response", async () => {
    const request: GetProvisioningStatusRequest = {
      location: url,
    };
    mock.onGet(url).reply(200, mockProvisioningStatus, { location: url });
    const result = (await client.getProvisioningStatus(request)) as GetProvisioningStatusResponse;
    expect(mock.history.get[0].url).toEqual(url);
    expect(result.status).toEqual(mockProvisioningStatus);
  });
  it("should throw a 404 error", async () => {
    mock.onGet(`undefined`).reply(404, { bad: "request" });
    await expect(
      async () =>
        await client.getProvisioningStatus({
          location: "undefined", // need location for axios mock
          not: "found",
        } as unknown as GetProvisioningStatusResponse)
    ).rejects.toThrow(/Provisioning job ID not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`undefined`).reply(statusCode, { unknown: "error thrown" } as unknown as GetProvisioningStatusResponse);
    await expect(
      async () =>
        await client.getProvisioningStatus({
          location: "undefined",
          unknown: "error",
        } as unknown as GetProvisioningStatusResponse)
    ).rejects.toThrow(/Unexpected API error/);
  });
});
