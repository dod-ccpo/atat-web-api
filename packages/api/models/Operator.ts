// import { AccessLevel } from "./AccessLevel";
import { ExhaustiveAttributeMap } from "./TypeFields";
// TODO: Combine Operator, PortfolioOperator, AppEnvOperator and AccessLevel
// since concepts are intertwined.
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

export enum AccessLevel {
  ADMINISTRATOR = "administrator",
  CONTRIBUTOR = "contributor",
  READ_ONLY = "read_only",
  PORTFOLIO_ADMINISTRATOR = "portfolio_administrator",
}