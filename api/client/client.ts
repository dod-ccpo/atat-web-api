import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as atatApiTypes from "./types";
import { CspResponse, HothProvisionRequest, ProvisioningStatusType, ProvisionRequest } from "./types";
import { ILogger, logger as defaultLogger } from "../../utils/logging";
import { camelToSnakeRequestInterceptor, snakeToCamelResponseInterceptor } from "./util";
import MockAdapter from "axios-mock-adapter";
import {
  CSP_A_TEST_ENDPOINT,
  CSP_A_TEST_ENDPOINT_NEW_SCHEMA,
  CSP_A_TEST_ENDPOINT_NEW_SCHEMA_MIGRATION,
  CSP_B_STATUS_ENDPOINT,
  CSP_B_TEST_ENDPOINT,
  cspAAddPortfolioRequest,
  cspAAddEnvironmentRequest,
  cspAAddEnvironmentRequestNewSchema,
  cspAAddEnvironmentRequestNewSchemaIsMigration,
  cspAUpdateTaskOrderRequest,
  TEST_ENVIRONMENT_ID,
  TEST_PORTFOLIO_ID,
  TEST_BAD_PORTFOLIO_ID,
  TEST_TASKORDER_ID,
  TEST_PROVISIONING_JOB_ID,
} from "../util/common-test-fixtures";

const CSP_MOCK_ENABLED = process.env.CSP_MOCK_ENABLED ?? "";

/**
 * An error that occurs during the
 */
export class AtatApiError extends Error {
  public readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly request: any;
  public readonly response?: AxiosResponse;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, name: string, request: any, response?: AxiosResponse) {
    super(message);
    this.name = name;
    this.request = request;
    this.response = response;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asCspResponse(): CspResponse<any, any> & { name: string } {
    return {
      code: 400,
      name: this.name,
      content: {
        request: this.request,
        response: this.response?.data,
      },
    };
  }
}

export interface IAtatClient {
  // Operations defined directly in the specification
  addPortfolio(request: atatApiTypes.AddPortfolioRequest): Promise<atatApiTypes.AddPortfolioResponseSync>;

  addEnvironment(
    request: atatApiTypes.AddEnvironmentRequest
  ): Promise<atatApiTypes.AddEnvironmentResponseSync | atatApiTypes.AddEnvironmentResponseAsync>;

  getPortfolioById(request: atatApiTypes.GetPortfolioRequest): Promise<atatApiTypes.GetPortfolioResponse>;

  patchEnvironment(
    request: atatApiTypes.PatchEnvironmentRequest
  ): Promise<atatApiTypes.PatchEnvironmentResponseSync | atatApiTypes.PatchEnvironmentResponseAsync>;

  getCostsByPortfolio(
    request: atatApiTypes.GetCostsByPortfolioRequest
  ): Promise<atatApiTypes.GetCostsByPortfolioResponse>;

  addTaskOrder(
    request: atatApiTypes.AddTaskOrderRequest
  ): Promise<atatApiTypes.AddTaskOrderResponseSync | atatApiTypes.AddTaskOrderResponseAsync>;

  updateTaskOrder(
    request: atatApiTypes.UpdateTaskOrderRequest
  ): Promise<atatApiTypes.UpdateTaskOrderResponseSync | atatApiTypes.UpdateTaskOrderResponseAsync>;

  getCostsByClin(request: atatApiTypes.GetCostsByClinRequest): Promise<atatApiTypes.GetCostsByClinResponse>;

  // Operations that check for the status of a previously-issued provisioning request
  getProvisioningStatus(
    request: atatApiTypes.GetProvisioningStatusRequest
  ): Promise<atatApiTypes.GetProvisioningStatusResponse>;

  transformSynchronousResponse<T extends atatApiTypes.AtatResponse>(
    field: keyof T,
    response: AxiosResponse,
    request:
      | atatApiTypes.GetPortfolioRequest
      | atatApiTypes.GetCostsByPortfolioRequest
      | atatApiTypes.GetCostsByClinRequest
      | atatApiTypes.GetProvisioningStatusRequest
      | atatApiTypes.AddPortfolioRequest
      | atatApiTypes.AddEnvironmentRequest
      | atatApiTypes.PatchEnvironmentRequest
      | atatApiTypes.AddTaskOrderRequest
  ): T;
}

/**
 * An ATAT API specification client for a single Cloud Service Provider.
 *
 * This expects to authenicate using an OAuth 2.0 Bearer Token to a single
 * cloud service provider, using the configuration object provided to the
 * constructor.
 */
export class AtatClient implements IAtatClient {
  /**
   * The version of the ATAT CSP API specification that is supported by this version
   * of the client. This should match the `info.version` from the OpenAPI specification.
   */
  public static supportedApiVersion = "1.1.0";

  private readonly client: AxiosInstance;
  private readonly logger: ILogger;

  constructor(authToken: string, cspUri: string, logger?: ILogger) {
    this.client = axios.create({
      baseURL: cspUri,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "User-Agent": "ATAT CSP Api Client",
        "Content-Type": "application/json",
        "X-Atat-Api-Version": AtatClient.supportedApiVersion,
      },
      // We will perform all validation of the status code within the various API invocation
      // methods rather than relying on Axios' configuration. This will allow us to return
      // more custom error information.
      validateStatus: () => true,
    });
    this.logger = logger ?? defaultLogger;

    // Dynamically convert all values to snake_case to send across the wire, per the API
    // specification and then convert responses to camelCase for the internal API of this
    // client.
    this.client.interceptors.request.use((cspClientRequest) => {
      this.logger.info("CSP Request", { cspClientRequest });
      return cspClientRequest;
    });
    this.client.interceptors.request.use(camelToSnakeRequestInterceptor);

    this.client.interceptors.response.use((clientResponse) => {
      const cspClientResponse = {
        status: clientResponse.status,
        statusText: clientResponse.statusText,
        headers: clientResponse.headers,
        config: clientResponse.config,
        data: clientResponse.data,
      };
      this.logger.info("CSP Response", { cspClientResponse });
      return cspClientResponse;
    });
    this.client.interceptors.response.use(snakeToCamelResponseInterceptor);
    // We should be able to remove this and always have mocks enabled once the fix mentioned in
    // https://github.com/ctimmerm/axios-mock-adapter/issues/357 is merged
    if (CSP_MOCK_ENABLED) {
      this.logger.info("Using mock axios client");
      this.setUpMocks();
    } else {
      this.logger.info("Using real axios client");
    }
  }

  private buildHeaders(request: Partial<atatApiTypes.ProvisionRequest>): Record<string, string> {
    const headers: Record<string, string> = {};

    // set deadline
    if (request.provisionDeadline) {
      headers["X-Provision-Deadline"] = request.provisionDeadline;
    }

    return headers;
  }

  private setUpMocks() {
    const mock = new MockAdapter(this.client, { onNoMatch: "passthrough" });

    // TODO: move this to a different file once it gets too big

    // CSP A should always return a 200 for AddPortfolio
    mock.onPost(`${CSP_A_TEST_ENDPOINT}/portfolios`).reply(200, {
      ...cspAAddPortfolioRequest.payload,
      id: TEST_PORTFOLIO_ID,
    });

    // CSP A should always return a 200 for AddEnvironment
    mock.onPost(`${CSP_A_TEST_ENDPOINT}/portfolios/${TEST_PORTFOLIO_ID}/environments`).reply(200, {
      ...cspAAddEnvironmentRequest.payload,
      id: TEST_ENVIRONMENT_ID,
    });

    // CSP A should always return a 200 for AddEnvironment with new schema
    mock.onPost(`${CSP_A_TEST_ENDPOINT_NEW_SCHEMA}/portfolios/${TEST_PORTFOLIO_ID}/environments`).reply(200, {
      ...cspAAddEnvironmentRequestNewSchema.payload,
      id: TEST_ENVIRONMENT_ID,
    });

    // CSP A should always return a 200 for AddEnvironment with new schema & migration
    mock.onPost(`${CSP_A_TEST_ENDPOINT_NEW_SCHEMA_MIGRATION}/portfolios/${TEST_PORTFOLIO_ID}/environments`).reply(200, {
      ...cspAAddEnvironmentRequestNewSchemaIsMigration.payload,
      id: TEST_ENVIRONMENT_ID,
    });

    // CSP A should always return a 200 for UpdateTaskOrder
    mock.onPut(`${CSP_A_TEST_ENDPOINT}/portfolios/${TEST_PORTFOLIO_ID}/task-orders/${TEST_TASKORDER_ID}`).reply(200, {
      ...cspAUpdateTaskOrderRequest.payload,
      id: TEST_ENVIRONMENT_ID,
    });

    // CSP B should always return a 202 with an IN_PROGRESS Status for AddEnvironment
    mock.onPost(`${CSP_B_TEST_ENDPOINT}/portfolios/${TEST_PORTFOLIO_ID}/environments`).reply(
      202,
      {
        portfolioId: TEST_PORTFOLIO_ID,
        provisioningJobId: TEST_PROVISIONING_JOB_ID,
        status: ProvisioningStatusType.IN_PROGRESS,
      },
      { location: `${CSP_B_STATUS_ENDPOINT}` }
    );

    // CSP B should always return a 200 with a SUCCESS Status for GetProvisioningStatus
    mock.onPost(`${CSP_B_STATUS_ENDPOINT}`).reply(200, {
      portfolioId: TEST_PORTFOLIO_ID,
      provisioningJobId: TEST_PROVISIONING_JOB_ID,
      status: ProvisioningStatusType.SUCCESS,
    });

    // CSP A should always return a 404 for GetPortfolio if a bad portfolioId is provided
    mock.onGet(`${CSP_A_TEST_ENDPOINT}/portfolios/${TEST_BAD_PORTFOLIO_ID}`).reply(404);

    // CSP A should always return a 200 for GetPortfolio
    mock.onGet(`${CSP_A_TEST_ENDPOINT}/portfolios/${TEST_PORTFOLIO_ID}`).reply(200, {
      id: TEST_PORTFOLIO_ID,
    });
  }

  public transformSynchronousResponse<T extends atatApiTypes.AtatResponse>(
    field: keyof T,
    response: AxiosResponse,
    request:
      | atatApiTypes.GetPortfolioRequest
      | atatApiTypes.GetCostsByPortfolioRequest
      | atatApiTypes.GetCostsByClinRequest
      | atatApiTypes.GetProvisioningStatusRequest
      | atatApiTypes.AddPortfolioRequest
      | atatApiTypes.AddEnvironmentRequest
      | atatApiTypes.PatchEnvironmentRequest
      | atatApiTypes.AddTaskOrderRequest
  ): T {
    return {
      [field]: response.data,
      $metadata: {
        status: response.status,
        request,
      },
    } as T;
  }

  private transformAsynchronousResponse(
    response: AxiosResponse,
    request: atatApiTypes.AddEnvironmentRequest
  ): atatApiTypes.AsyncProvisionResponse {
    return {
      status: response.data,
      location: response.headers.location ?? "",
      $metadata: {
        status: response.status,
        request,
      },
    };
  }

  /**
   * Make a request to create a portfolio at the target Cloud Service Provider.
   *
   * This will return a concrete Portfolio object.
   */
  async addPortfolio(request: atatApiTypes.AddPortfolioRequest): Promise<atatApiTypes.AddPortfolioResponseSync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.post("/portfolios", request.portfolio, { headers });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.AddPortfolioResponseSync>("portfolio", response, request);
      case 400:
        throw new AtatApiError("Invalid portfolio provided", "InvalidPortfolio", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Make a request to create an environment in a specific portfolio at the target
   * Cloud Service Provider.
   *
   * This may return either a concrete Environment object or a {@link ProvisioningStatus} that
   * can be used to query the status of an asynchronous Environment creation request.
   *
   * Whether the creation is synchronous or asynchronous is an implementation decision of
   * the ATAT server implementation (or, of the Cloud Service Provider) and may not be
   * directly influenced by the parameters to this function.
   */
  async addEnvironment(
    request: atatApiTypes.AddEnvironmentRequest
  ): Promise<atatApiTypes.AddEnvironmentResponseSync | atatApiTypes.AddEnvironmentResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.post(
      `/portfolios/${encodeURIComponent(request.portfolioId)}/environments`,
      request.environment,
      {
        headers,
      }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.AddEnvironmentResponseSync>(
          "environment",
          response,
          request
        );
      case 202:
        return this.transformAsynchronousResponse(response, request);
      case 400:
        throw new AtatApiError("Invalid environment provided", "InvalidEnvironment", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Get the details of a Portfolio object.
   */
  async getPortfolioById(request: atatApiTypes.GetPortfolioRequest): Promise<atatApiTypes.GetPortfolioResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(`/portfolios/${encodeURIComponent(request.portfolioId)}`, { headers });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.GetPortfolioResponse>("portfolio", response, request);
      case 400:
        throw new AtatApiError("Invalid ID supplied", "InvalidPortfolioId", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Update the details of a provisioned Portfolio.
   *
   * Primarily, this is used to add or reset the access of particular portfolio administrators.
   */
  async patchEnvironment(
    request: atatApiTypes.PatchEnvironmentRequest
  ): Promise<atatApiTypes.PatchEnvironmentResponseSync | atatApiTypes.PatchEnvironmentResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.patch(
      `/portfolios/${encodeURIComponent(request.portfolioId)}/environments/${encodeURIComponent(
        request.environmentId
      )}`,
      request.patch,
      { headers }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.PatchEnvironmentResponseSync>("patch", response, request);
      case 400:
        throw new AtatApiError("Invalid portfolio provided", "InvalidPortfolio", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Get cost details for an entire Portfolio.
   *
   * This returns actuals and forecasts for the entire portfolio.
   */
  async getCostsByPortfolio(
    request: atatApiTypes.GetCostsByPortfolioRequest
  ): Promise<atatApiTypes.GetCostsByPortfolioResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(`/portfolios/${encodeURIComponent(request.portfolioId)}/costs`, {
      params: {
        start_date: request.startDate,
        end_date: request.endDate,
      },
      headers,
    });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.GetCostsByPortfolioResponse>("costs", response, request);
      case 400:
        throw new AtatApiError("Invalid ID or query parameters", "InvalidCostQuery", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Add details of a task order that is used to fund resources and services for the Portfolio.
   */
  async addTaskOrder(
    request: atatApiTypes.AddTaskOrderRequest
  ): Promise<atatApiTypes.AddTaskOrderResponseSync | atatApiTypes.AddTaskOrderResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.post(
      `/portfolios/${encodeURIComponent(request.portfolioId)}/task-orders`,
      request.taskOrder,
      {
        headers,
      }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.AddTaskOrderResponseSync>("taskOrder", response, request);
      case 400:
        throw new AtatApiError("Invalid ID supplied", "InvalidPortfolioId", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Update details of a task order that is used to fund resources and services for the Portfolio.
   */
  async updateTaskOrder(
    request: atatApiTypes.UpdateTaskOrderRequest
  ): Promise<atatApiTypes.UpdateTaskOrderResponseSync | atatApiTypes.UpdateTaskOrderResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.put(
      `/portfolios/${encodeURIComponent(request.portfolioId)}/task-orders/${encodeURIComponent(request.taskOrderId)}`,
      request.taskOrder,
      {
        headers,
      }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.UpdateTaskOrderResponseSync>(
          "taskOrder",
          response,
          request
        );
      case 400:
        throw new AtatApiError("Invalid ID supplied", "InvalidPortfolioId", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Provides actual and forecasted cost information for a CLIN on a particular Task Order that is
   * used to fund a specific Portfolio.
   */
  async getCostsByClin(request: atatApiTypes.GetCostsByClinRequest): Promise<atatApiTypes.GetCostsByClinResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(
      `/portfolios/${encodeURIComponent(request.portfolioId)}/task-orders/${request.taskOrderNumber}/clins/${
        request.clin
      }/costs`,
      { params: { start_date: request.startDate, end_date: request.endDate }, headers }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<atatApiTypes.GetCostsByClinResponse>("costs", response, request);
      case 400:
        throw new AtatApiError("Invalid ID or query parameters", "InvalidCostQuery", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  async getProvisioningStatus(
    request: atatApiTypes.GetProvisioningStatusRequest
  ): Promise<atatApiTypes.GetProvisioningStatusResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(request.location, { headers });
    switch (response.status) {
      case 200:
        return {
          ...this.transformSynchronousResponse<atatApiTypes.GetProvisioningStatusResponse>("status", response, request),
          location: request.location,
        };
      case 404:
        throw new AtatApiError("Provisioning job ID not found", "ProvisioningJobNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }
}

export function transformSynchronousResponse(
  response: atatApiTypes.AtatResponse,
  provisionRequest: ProvisionRequest,
  hothProvisionRequest: HothProvisionRequest
): CspResponse<ProvisionRequest, atatApiTypes.AtatResponse> {
  return {
    code: response.$metadata.status,
    content: {
      response,
      request: provisionRequest,
    },
    initialSnowRequest: hothProvisionRequest,
  };
}

export function transformAsynchronousResponse(
  response: atatApiTypes.AsyncProvisionResponse,
  provisionRequest: ProvisionRequest,
  hothProvisionRequest: HothProvisionRequest
): CspResponse<ProvisionRequest, atatApiTypes.AsyncProvisionResponse | { details: string }> {
  if (response.location) {
    return {
      code: response.$metadata.status,
      content: {
        response,
        request: provisionRequest,
      },
      initialSnowRequest: hothProvisionRequest,
    };
  }
  return {
    code: 500,
    content: {
      response: {
        details: "Location header was invalid or not provided",
      },
      request: provisionRequest,
    },
    initialSnowRequest: hothProvisionRequest,
  };
}
