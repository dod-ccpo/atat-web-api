import { CspResponse } from "../util/csp-request";

export interface Metadata<T> {
  readonly status: number;
  readonly request: T;
}

/**
 * The available statuses for an asynchronous provisioning job.
 */
export enum ProvisioningStatusType {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
}

/**
 * Represents the status of an asynchronous provisioning job that has been submitted and
 * that has been accepted by the target Cloud Service Provider.
 */
export interface ProvisioningStatus {
  /**
   * The ID of a provisioning job; used for later retrieving the status to inform an end user.
   */
  readonly provisioningJobId: string;
  /**
   * The ID of the Portfolio for which status is being returned.
   */
  readonly portfolioId: string;
  /**
   * The current status of the provisioning request.
   */
  readonly status: ProvisioningStatusType;
}

/**
 * A CLIN in a Task Order.
 */
export interface Clin {
  readonly clinNumber: string;
  readonly popStartDate: string;
  readonly popEndDate: string;
}

/**
 * A Task Order and CLINs used to pay for provisioned resources and services.
 */
export interface TaskOrder {
  readonly taskOrderNumber: string;
  readonly clins: Clin[];
  readonly popStartDate: string;
  readonly popEndDate: string;
}

/**
 * An individual who should have access to a Portfolio in a target Cloud Environment.
 */
export interface Administrator {
  readonly email: string;
  readonly dodId: string;
  /**
   * @default false
   */
  readonly needsReset: boolean;
}

export interface EnvironmentPatchInput {
  readonly administrators: Administrator[];
}

export interface CloudDistinguisher {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
}

/**
 * The available Impact Levels for target Cloud Environments.
 */
export enum ClassificationLevel {
  UNCLASSIFIED = "UNCLASSIFIED",
  SECRET = "SECRET",
  TOP_SECRET = "TOP_SECRET",
}

export interface Environment extends EnvironmentPatchInput {
  readonly id?: string;
  readonly name: string;
  readonly classificationLevel: ClassificationLevel;
  readonly dashboardLink?: string;
  readonly cloudDistinguisher?: CloudDistinguisher;
}

export interface Portfolio {
  readonly name: string;
  readonly taskOrders: TaskOrder[];
  readonly id?: string;
}

export interface CostData {
  readonly total?: string;
  readonly results?: { month: string; value: string }[];
}

export interface CostResponseByClin {
  readonly actual?: CostData[];
  readonly forecast?: CostData[];
}

export interface CostResponseByPortfolio {
  readonly taskOrders: {
    taskOrderNumber: string;
    clins: {
      clinNumber: string;
      actual?: CostData[];
      forecast?: CostData[];
    }[];
  }[];
}

export interface ProvisionRequest {
  readonly provisionDeadline?: string;
}
export interface AtatResponse {
  $metadata: Metadata<any>;
}
export interface AsyncProvisionResponse extends AtatResponse {
  readonly location: string;
  readonly status: ProvisioningStatus;
}
export interface ErrorResponse extends AtatResponse {
  errorMessage?: string;
  errorCode?: string;
}

export interface AddPortfolioRequest extends ProvisionRequest {
  readonly portfolio: Portfolio;
}
export interface AddPortfolioResponseSync extends AtatResponse {
  readonly portfolio: Portfolio;
}
export interface AddEnvironmentRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly environment: Environment;
}
export interface AddEnvironmentResponseSync extends AtatResponse {
  readonly environment: Environment;
}
export type AddEnvironmentResponseAsync = AsyncProvisionResponse;

export interface GetPortfolioRequest extends ProvisionRequest {
  readonly portfolioId: string;
}
export interface GetPortfolioResponse extends AtatResponse {
  readonly portfolio: Environment;
}

export interface PatchEnvironmentRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly environmentId: string;
  readonly patch: EnvironmentPatchInput;
}
export interface PatchEnvironmentResponseSync extends AtatResponse {
  readonly patch: EnvironmentPatchInput;
}
export type PatchEnvironmentResponseAsync = AsyncProvisionResponse;

export interface GetCostsByPortfolioRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly startDate: string;
  readonly endDate: string;
}
export interface GetCostsByPortfolioResponse extends AtatResponse {
  readonly costs: CostResponseByPortfolio;
}

export interface AddTaskOrderRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly taskOrder: TaskOrder;
}
export interface AddTaskOrderResponseSync extends AtatResponse {
  readonly taskOrder: TaskOrder;
}
export type AddTaskOrderResponseAsync = AsyncProvisionResponse;

export interface GetCostsByClinRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly taskOrderNumber: string;
  readonly clin: string;
  readonly startDate: string;
  readonly endDate: string;
}
export interface GetCostsByClinResponse extends AtatResponse {
  readonly costs: CostResponseByClin;
}

export interface GetProvisioningStatusRequest extends ProvisionRequest {
  readonly location: string;
}
export interface GetProvisioningStatusResponse extends AtatResponse {
  readonly status: ProvisioningStatus;
  readonly location: string;
}

export type ProvisionCspResponse =
  | CspResponse<AddPortfolioRequest, AtatResponse>
  | CspResponse<AddEnvironmentRequest, AtatResponse>
  | CspResponse<AddEnvironmentRequest, AsyncProvisionResponse | { details: string }>
  | CspResponse<GetProvisioningStatusRequest, GetProvisioningStatusResponse>;
