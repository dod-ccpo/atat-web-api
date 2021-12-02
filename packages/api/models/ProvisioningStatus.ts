import { PortfolioDraftModel } from "./PortfolioDraft";
import { ApplicationStepModel } from "./ApplicationStep";
import { FundingStepModel } from "./FundingStep";
import { Operators } from "./Operator";
import { CloudServiceProvider } from "./CloudServiceProvider";

export enum ProvisioningStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  FAILED = "failed",
  COMPLETE = "complete",
}

export enum ProvisioningRequestType {
  FULL_PORTFOLIO = "full_portfolio",
  APPLICATIONS = "applications",
  ENVIRONMENTS = "environments",
  TASK_ORDERS = "task_orders",
  OPERATORS = "operators",
}

type ProvisioningBody = PortfolioDraftModel | ApplicationStepModel | FundingStepModel | Operators;
export interface ProvisioningTaskInputModel {
  body: ProvisioningBody;
  type: ProvisioningRequestType;
  csp: CloudServiceProvider;
}
