import { Application } from "./Application";
import { PortfolioOperator } from "./PortfolioOperator";

export enum ValidationMessage {
  INVALID_APPLICATION_NAME = "application name must be between 4 and 100 characters",
  INVALID_ENVIRONMENT_NAME = "environment name must be between 4 and 100 characters",
}
export interface ApplicationStep {
  applications: Array<Application>;
  operators: Array<PortfolioOperator>;
}
