import MockAdapter from "axios-mock-adapter";
import { AtatClient } from "./client";
import {
  mockCostData,
  mockPortfolio,
  mockAddTaskOrderRequest,
  portfolioId,
  location,
  mockProvisioningStatus,
  mockTaskOrder,
  mockGetCostsByClinRequest,
  administrators,
  mockPatchPortfolioRequest,
  provisioningJobId,
} from "./fixtures";
import {
  AddPortfolioRequest,
  AddPortfolioResponseAsync,
  AddPortfolioResponseSync,
  GetCostsByPortfolioResponse,
  Portfolio,
  ImpactLevel,
  GetPortfolioResponse,
  GetPortfolioRequest,
  PatchPortfolioRequest,
  PatchPortfolioResponseSync,
  PatchPortfolioResponseAsync,
  GetCostsByPortfolioRequest,
  AddTaskOrderResponseSync,
  AddTaskOrderResponseAsync,
  CostResponseByClin,
  GetProvisioningStatusResponse,
  GetProvisioningStatusRequest,
  AddTaskOrderRequest,
  GetCostsByClinResponse,
  GetCostsByClinRequest,
} from "./types";

const TEST_API_TOKEN = "TEST-TOKEN-NOT-REAL";
const TEST_CSP_ENDPOINT = "https://localhost/atat/api/v1";
const TEST_CSP_NETWORKS = ["NETWORK_1", "NETWORK_2"];

describe("addPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const portfolio: Portfolio = {
    name: "Test Portfolio",
    taskOrders: [],
    administrators: [],
  };
  const url = `${TEST_CSP_ENDPOINT}/portfolios`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
  it("should handle a successful 202 response", async () => {
    mock.onPost(url).reply(202, mockProvisioningStatus, { "Content-Type": "application/json", location });
    const result = (await client.addPortfolio({ portfolio })) as AddPortfolioResponseAsync;
    expect(mock.history.post[0].url).toEqual(`/portfolios`);
    expect(result.status).toEqual(mockProvisioningStatus);
    expect(result.location).toEqual(location);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onPost(url).reply(400, { bad: "request" });
    expect(async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)).rejects.toThrow(
      /Invalid portfolio provided/
    );
  });
  it.each([204, 500, 405, 404, 410, 503])(
    "should throw an error on any unexpected response (ex: %s)",
    async (statusCode) => {
      mock.onPost(url).reply(statusCode, { bad: "request" });
      expect(async () => await client.addPortfolio({ bad: "input" } as unknown as AddPortfolioRequest)).rejects.toThrow(
        /Unexpected API error/
      );
    }
  );
});

describe("getPortfolioById", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}`;
  const portfolio: Portfolio = {
    ...mockPortfolio,
    id: "csp-portfolio-id-123",
  };
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
      targetImpactLevel: ImpactLevel.IL2,
    })) as GetPortfolioResponse;
    expect(mock.history.get[0].url).toEqual(`/portfolios/${portfolioId}`);
    expect(result.portfolio).toEqual(portfolio);
  });
  it("should throw an error on a 400 response", async () => {
    mock.onGet(`portfolios/undefined`).reply(400, { bad: "request" });
    expect(
      async () => await client.getPortfolioById({ bad: "input" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Invalid ID supplied/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(`portfolios/undefined`).reply(404, { not: "found" });
    expect(
      async () => await client.getPortfolioById({ not: "found" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`portfolios/undefined`).reply(statusCode, { unknown: "error thrown" });
    expect(
      async () => await client.getPortfolioById({ unexpected: "error" } as unknown as GetPortfolioRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("patchPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
    // see comment in 'addPortfolio' test above for more info on the mocking axios instance
    // eslint-disable-next-line dot-notation
    mock = new MockAdapter(client["client"], { onNoMatch: "throwException" });
  });
  afterEach(() => {
    mock.reset();
  });
  it("should handle a successful 200 response for patching portfolio details", async () => {
    const request: PatchPortfolioRequest = {
      ...mockPatchPortfolioRequest,
      provisionDeadline: "2022-11-15",
    };
    mock.onPatch(url).reply(200, { patch: administrators });
    const result = (await client.patchPortfolio(request)) as PatchPortfolioResponseSync;
    expect(mock.history.patch[0].url).toEqual(`/portfolios/${portfolioId}`);
    expect(result.patch).toEqual({ patch: administrators });
  });
  it("should handle a successful 202 response with location header", async () => {
    mock.onPatch(url).reply(202, mockProvisioningStatus, { location });
    const result = (await client.patchPortfolio(mockPatchPortfolioRequest)) as PatchPortfolioResponseAsync;
    expect(mock.history.patch[0].url).toEqual(`/portfolios/${portfolioId}`);
    expect(result.location).toEqual(location);
    expect(result.status).toEqual(mockProvisioningStatus);
  });
  it("should throw a 400 error", async () => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(400, { bad: "request" });
    expect(
      async () => await client.patchPortfolio({ bad: "input" } as unknown as PatchPortfolioRequest)
    ).rejects.toThrow(/Invalid portfolio provided/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(404, { not: "found" });
    expect(
      async () => await client.patchPortfolio({ not: "found" } as unknown as PatchPortfolioRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onPatch(`${TEST_CSP_ENDPOINT}/portfolios/undefined`).reply(statusCode, { unknown: "error thrown" });
    expect(
      async () => await client.patchPortfolio({ unknown: "error" } as unknown as PatchPortfolioRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("getCostsByPortfolio", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/cost`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
    expect(
      async () => await client.getCostsByPortfolio({ bad: "input" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Invalid ID or query parameters/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(`${TEST_CSP_ENDPOINT}/portfolios/undefined/cost`).reply(404, { not: "found" });
    expect(
      async () => await client.getCostsByPortfolio({ not: "found" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`${TEST_CSP_ENDPOINT}/portfolios/undefined/cost`).reply(statusCode, { unknown: "error thrown" });
    expect(
      async () => await client.getCostsByPortfolio({ unknown: "error" } as unknown as GetCostsByPortfolioRequest)
    ).rejects.toThrow(/Unexpected API error/);
  });
});

describe("addTaskOrder", () => {
  let client: AtatClient;
  let mock: MockAdapter;
  const url = `${TEST_CSP_ENDPOINT}/portfolios/${portfolioId}/task-orders`;
  beforeAll(() => {
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
  it("should handle a successful 202 response with location header", async () => {
    mock.onPost(url).reply(202, mockProvisioningStatus, { location });
    const result = (await client.addTaskOrder(mockAddTaskOrderRequest)) as AddTaskOrderResponseAsync;
    expect(mock.history.post[0].url).toEqual(`/portfolios/${portfolioId}/task-orders`);
    expect(result.location).toEqual(location);
    expect(result.status).toEqual(mockProvisioningStatus);
  });
  it("should throw a 400 error", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(400, { bad: "request" });
    expect(async () => await client.addTaskOrder({ bad: "input" } as unknown as AddTaskOrderRequest)).rejects.toThrow(
      /Invalid ID supplied/
    );
  });
  it("should throw an error on a 404 response", async () => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(404, { not: "found" });
    expect(async () => await client.addTaskOrder({ not: "found" } as unknown as AddTaskOrderRequest)).rejects.toThrow(
      /Portfolio not found/
    );
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onPost(`${TEST_CSP_ENDPOINT}/portfolios/undefined/task-orders`).reply(statusCode, { unknown: "error thrown" });
    expect(
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
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
    expect(
      async () => await client.getCostsByClin({ bad: "input" } as unknown as GetCostsByClinRequest)
    ).rejects.toThrow(/Invalid ID or query parameters/);
  });
  it("should throw an error on a 404 response", async () => {
    mock.onGet(badUrl).reply(404, { not: "found" });
    expect(
      async () => await client.getCostsByClin({ not: "found" } as unknown as GetCostsByClinRequest)
    ).rejects.toThrow(/Portfolio not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(badUrl).reply(statusCode, { unknown: "error thrown" });
    expect(
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
    client = new AtatClient(TEST_API_TOKEN, { uri: TEST_CSP_ENDPOINT, networks: TEST_CSP_NETWORKS });
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
      targetImpactLevel: ImpactLevel.IL2,
    };
    mock.onGet(url).reply(200, mockProvisioningStatus, { location: url });
    const result = (await client.getProvisioningStatus(request)) as GetProvisioningStatusResponse;
    expect(mock.history.get[0].url).toEqual(url);
    expect(result.status).toEqual(mockProvisioningStatus);
  });
  it("should throw a 404 error", async () => {
    mock.onGet(`undefined`).reply(404, { bad: "request" });
    expect(
      async () =>
        await client.getProvisioningStatus({
          location: "undefined", // need location for axios mock
          not: "found",
        } as unknown as GetProvisioningStatusResponse)
    ).rejects.toThrow(/Provisioning job ID not found/);
  });
  it.each([204, 405, 410, 500, 503])("should throw an unexpected error %s", async (statusCode) => {
    mock.onGet(`undefined`).reply(statusCode, { unknown: "error thrown" } as unknown as GetProvisioningStatusResponse);
    expect(
      async () =>
        await client.getProvisioningStatus({
          location: "undefined",
          unknown: "error",
        } as unknown as GetProvisioningStatusResponse)
    ).rejects.toThrow(/Unexpected API error/);
  });
});
