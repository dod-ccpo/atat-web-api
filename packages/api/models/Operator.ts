import { ExhaustivePropertyMap } from "./TypeFields";

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
}

export interface PortfolioOperator extends Operator {
  access: PortfolioAccess;
}

export interface AppEnvOperator extends Operator {
  access: AppEnvAccess;
}

export type Operators = PortfolioOperator | AppEnvOperator;
export const operatorFields: ExhaustivePropertyMap<Operators> = {
  display_name: null,
  email: null,
  access: null,
};

export function isAdministrator(operator: Operators): boolean {
  return operator.access === PortfolioAccess.PORTFOLIO_ADMINISTRATOR || operator.access === AppEnvAccess.ADMINISTRATOR;
}
