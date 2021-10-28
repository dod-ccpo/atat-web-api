import { ExhaustiveAttributeMap } from "./TypeFields";

export enum AccessLevel {
  ADMINISTRATOR = "administrator",
  CONTRIBUTOR = "contributor",
  READ_ONLY = "read_only",
  PORTFOLIO_ADMINISTRATOR = "portfolio_administrator",
}

export enum PortfolioAccess {
  PORTFOLIO_ADMINISTRATOR = "portfolio_administrator",
}

export enum AppEnvAccess {
  ADMINISTRATOR = "administrator",
  CONTRIBUTOR = "contributor",
  READ_ONLY = "read_only",
}

export interface Operator {
  display_name: string;
  email: string;
  access: AccessLevel;
}

export const operatorFields: ExhaustiveAttributeMap<Operator> = {
  display_name: null,
  email: null,
  access: null,
};

export interface PortfolioOperator extends Operator {
  access: AccessLevel.PORTFOLIO_ADMINISTRATOR;
}

export interface AppEnvOperator extends Operator {
  access: AccessLevel.ADMINISTRATOR | AccessLevel.CONTRIBUTOR | AccessLevel.READ_ONLY;
}
