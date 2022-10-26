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
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

/**
 * The available Impact Levels for target Cloud Environments.
 */
export enum ImpactLevel {
  IL2 = "IL2",
  IL4 = "IL4",
  IL5 = "IL5",
  IL6 = "IL6",
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
export interface Operator {
  readonly email: string;
  readonly dodId: string;
  /**
   * @default false
   */
  readonly needsReset: boolean;
}

export interface PortfolioPatchInput {
  readonly administrators: Operator[];
}

export interface Portfolio extends PortfolioPatchInput {
  readonly name: string;
  readonly taskOrders: TaskOrder[];
  readonly id?: string;
  readonly dashboardLink?: string;
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

export interface AtatRequest {
  readonly targetImpactLevel?: ImpactLevel;
}
export interface ProvisionRequest extends AtatRequest {
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
export type AddPortfolioResponseAsync = AsyncProvisionResponse;

export interface GetPortfolioRequest extends AtatRequest {
  readonly portfolioId: string;
}
export interface GetPortfolioResponse extends AtatResponse {
  readonly portfolio: Portfolio;
}

export interface PatchPortfolioRequest extends ProvisionRequest {
  readonly portfolioId: string;
  readonly patch: PortfolioPatchInput;
}
export interface PatchPortfolioResponseSync extends AtatResponse {
  readonly patch: PortfolioPatchInput;
}
export type PatchPortfolioResponseAsync = AsyncProvisionResponse;

export interface GetCostsByPortfolioRequest extends AtatRequest {
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

export interface GetCostsByClinRequest extends AtatRequest {
  readonly portfolioId: string;
  readonly taskOrderNumber: string;
  readonly clin: string;
  readonly startDate: string;
  readonly endDate: string;
}
export interface GetCostsByClinResponse extends AtatResponse {
  readonly costs: CostResponseByClin;
}

export interface GetProvisioningStatusRequest extends AtatRequest {
  readonly location: string;
}
export interface GetProvisioningStatusResponse extends AtatResponse {
  readonly status: ProvisioningStatus;
  readonly location: string;
}
