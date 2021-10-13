import { AccessLevel } from "./AccessLevel";
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
