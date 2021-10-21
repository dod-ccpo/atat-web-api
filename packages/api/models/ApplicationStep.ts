import { Application } from "./Application";
import { PortfolioOperator } from "./Operator";

export interface ApplicationStep {
  applications: Array<Application>;
  operators: Array<PortfolioOperator>;
}

export enum ValidationMessage {
  INVALID_APPLICATION_NAME = "application name must be between 4 and 100 characters",
  INVALID_ENVIRONMENT_NAME = "environment name must be between 4 and 100 characters",
  INVALID_OPERATOR_NAME = "operator display_name must be between 1 and 100 characters",
  INVALID_OPERATOR_EMAIL = "operator email must include '@' and end with '.mil'",
}
interface BaseValidationError {
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}

interface ApplicationValidationError extends BaseValidationError {
  applicationName: string;
}
interface EnvironmentValidationError extends BaseValidationError {
  environmentName: string;
}
interface OperatorDisplayNameValidationError extends BaseValidationError {
  operatorDisplayName: string;
}
interface OperatorEmailValidationError extends BaseValidationError {
  operatorEmail: string;
}

export type ApplicationStepValidationErrors =
  | ApplicationValidationError
  | EnvironmentValidationError
  | OperatorDisplayNameValidationError
  | OperatorEmailValidationError;
