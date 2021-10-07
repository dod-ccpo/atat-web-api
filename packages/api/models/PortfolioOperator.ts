import { AccessLevel } from "./AccessLevel";
import { Operator } from "./Operator";

export interface PortfolioOperator extends Operator {
  access: AccessLevel.PORTFOLIO_ADMINISTRATOR;
}
