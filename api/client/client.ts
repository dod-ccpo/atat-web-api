import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as types from "./types";
import { ILogger, logger as defaultLogger } from "../../utils/logging";
import { CspResponse } from "../util/csp-request";
import { camelToSnakeRequestInterceptor, snakeToCamelResponseInterceptor } from "./util";

// TODO: Move this block to another file. It is marginally useful here.
interface CspConfigurationItem {
  uri: string;
}

/**
 * An error that occurs during the
 */
export class AtatApiError extends Error {
  public readonly name: string;
  public readonly request: any;
  public readonly response?: AxiosResponse;

  constructor(message: string, name: string, request: any, response?: AxiosResponse) {
    super(message);
    this.name = name;
    this.request = request;
    this.response = response;
  }

  // Unfortunately in this case because we're handling errors, we can't do much better than
  // an `any` here -- unless we considered making AtatApiError itself generic which provides
  // less clear benefits.
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
  addPortfolio(
    request: types.AddPortfolioRequest
  ): Promise<types.AddPortfolioResponseSync | types.AddPortfolioResponseAsync>;
  getPortfolioById(request: types.GetPortfolioRequest): Promise<types.GetPortfolioResponse>;
  patchPortfolio(
    request: types.PatchPortfolioRequest
  ): Promise<types.PatchPortfolioResponseSync | types.PatchPortfolioResponseAsync>;
  getCostsByPortfolio(request: types.GetCostsByPortfolioRequest): Promise<types.GetCostsByPortfolioResponse>;
  addTaskOrder(
    request: types.AddTaskOrderRequest
  ): Promise<types.AddTaskOrderResponseSync | types.AddTaskOrderResponseAsync>;
  getCostsByClin(request: types.GetCostsByClinRequest): Promise<types.GetCostsByClinResponse>;

  // Operations that check for the status of a previously-issued provisioning request
  getProvisioningStatus(request: types.GetProvisioningStatusRequest): Promise<types.GetProvisioningStatusResponse>;
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
  public static supportedApiVersion = "v0.3.0";

  private readonly client: AxiosInstance;
  private readonly logger: ILogger;

  constructor(authToken: string, cspConfiguration: CspConfigurationItem, logger?: ILogger) {
    this.client = axios.create({
      baseURL: cspConfiguration.uri,
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

    // Dynamically convert all values to snake_case to send across the wire, per the API
    // specification and then convert responses to camelCase for the internal API of this
    // client.
    this.client.interceptors.request.use(camelToSnakeRequestInterceptor);
    this.client.interceptors.response.use(snakeToCamelResponseInterceptor);
    this.logger = logger ?? defaultLogger;
  }

  private buildHeaders(request: Partial<types.ProvisionRequest>): Record<string, string> {
    const headers: Record<string, string> = {};
    if (request.targetImpactLevel) {
      headers["X-Target-Impact-Level"] = request.targetImpactLevel.toString();
    }
    if (request.provisionDeadline) {
      headers["X-Provision-Deadline"] = request.provisionDeadline;
    }
    return headers;
  }

  private transformSynchronousResponse<T extends types.AtatResponse>(field: keyof T, response: AxiosResponse): T {
    return {
      [field]: response.data,
      $metadata: {
        status: response.status,
        request: response.request,
      },
    } as T;
  }

  private transformAsynchronousResponse(response: AxiosResponse): types.AsyncProvisionResponse {
    return {
      status: response.data,
      location: response.headers.location,
      $metadata: {
        status: response.status,
        request: response.request,
      },
    };
  }

  /**
   * Make a request to create a portfolio at the target Cloud Service Provider.
   *
   * This may return either a concrete Portfolio object or a {@link ProvisioningStatus} that
   * can be used to query the status of an asynchronous Portfolio creation request.
   *
   * Whether the creation is synchronous or asynchronous is an implementation decision of
   * the ATAT server implementation (or, of the Cloud Service Provider) and may not be
   * directly influenced by the parameters to this function.
   */
  async addPortfolio(
    request: types.AddPortfolioRequest
  ): Promise<types.AddPortfolioResponseSync | types.AddPortfolioResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.post("/portfolios", request.portfolio, { headers });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.AddPortfolioResponseSync>("portfolio", response);
      case 202:
        return this.transformAsynchronousResponse(response);
      case 400:
        throw new AtatApiError("Invalid portfolio provided", "InvalidPortfolio", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  /**
   * Get the details of a Portfolio object.
   */
  async getPortfolioById(request: types.GetPortfolioRequest): Promise<types.GetPortfolioResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(`/portfolios/${request.portfolioId}`, { headers });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.GetPortfolioResponse>("portfolio", response);
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
  async patchPortfolio(
    request: types.PatchPortfolioRequest
  ): Promise<types.PatchPortfolioResponseSync | types.PatchPortfolioResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.patch(`/portfolios/${request.portfolioId}`, request.patch, { headers });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.PatchPortfolioResponseSync>("patch", response);
      case 202:
        return this.transformAsynchronousResponse(response);
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
  async getCostsByPortfolio(request: types.GetCostsByPortfolioRequest): Promise<types.GetCostsByPortfolioResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(`/portfolios/${request.portfolioId}/cost`, {
      params: {
        start_date: request.startDate,
        end_date: request.endDate,
      },
      headers,
    });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.GetCostsByPortfolioResponse>("costs", response);
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
    request: types.AddTaskOrderRequest
  ): Promise<types.AddTaskOrderResponseSync | types.AddTaskOrderResponseAsync> {
    const headers = this.buildHeaders(request);
    const response = await this.client.post(`/portfolios/${request.portfolioId}/task-orders`, request.taskOrder, {
      headers,
    });
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.AddTaskOrderResponseSync>("taskOrder", response);
      case 202:
        return this.transformAsynchronousResponse(response);
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
  async getCostsByClin(request: types.GetCostsByClinRequest): Promise<types.GetCostsByClinResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(
      `/portfolios/${request.portfolioId}/task-orders/${request.taskOrderNumber}/clins/${request.clin}/cost`,
      { params: { start_date: request.startDate, end_date: request.endDate }, headers }
    );
    switch (response.status) {
      case 200:
        return this.transformSynchronousResponse<types.GetCostsByClinResponse>("costs", response);
      case 400:
        throw new AtatApiError("Invalid ID or query parameters", "InvalidCostQuery", request, response);
      case 404:
        throw new AtatApiError("Portfolio not found", "PortfolioNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected API error", "CspApiError", request, response);
    }
  }

  async getProvisioningStatus(
    request: types.GetProvisioningStatusRequest
  ): Promise<types.GetProvisioningStatusResponse> {
    const headers = this.buildHeaders(request);
    const response = await this.client.get(request.location, { headers });
    switch (response.status) {
      case 200:
        return {
          ...this.transformSynchronousResponse<types.GetProvisioningStatusResponse>("status", response),
          location: request.location,
        };
      case 404:
        throw new AtatApiError("Provisionining job ID not found", "ProvisioningJobNotFound", request, response);
      default:
        throw new AtatApiError("Unexpected APU error", "CspApiError", request, response);
    }
  }
}
