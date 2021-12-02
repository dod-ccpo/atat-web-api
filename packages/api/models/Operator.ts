import { ExhaustivePropertyMap } from "./TypeFields";

export enum PortfolioAccess {
  PORTFOLIO_ADMINISTRATOR = "portfolio_administrator",
}

export enum AppEnvAccess {
  ADMINISTRATOR = "administrator",
  CONTRIBUTOR = "contributor",
  READ_ONLY = "read_only",
}

export interface OperatorModel {
  display_name: string;
  email: string;
}

export interface PortfolioOperatorModel extends OperatorModel {
  access: PortfolioAccess;
}

export interface AppEnvOperatorModel extends OperatorModel {
  access: AppEnvAccess;
}

export type Operators = PortfolioOperatorModel | AppEnvOperatorModel;
export const operatorFields: ExhaustivePropertyMap<Operators> = {
  display_name: null,
  email: null,
  access: null,
};

export function isAdministrator(operator: Operators): boolean {
  return operator.access === PortfolioAccess.PORTFOLIO_ADMINISTRATOR || operator.access === AppEnvAccess.ADMINISTRATOR;
}
