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
  access: string;
}

export interface PortfolioOperator extends Operator {
  access: PortfolioAccess.PORTFOLIO_ADMINISTRATOR;
}

export interface AppEnvOperator extends Operator {
  access: AppEnvAccess.ADMINISTRATOR | AppEnvAccess.CONTRIBUTOR | AppEnvAccess.READ_ONLY;
}
export const operatorFields: ExhaustivePropertyMap<Operator> = {
  display_name: null,
  email: null,
  access: null,
};
