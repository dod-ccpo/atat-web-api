import { PortfolioStep } from "./PortfolioStep";
import { PortfolioDraftSummary } from "./PortfolioDraftSummary";

export interface PortfolioDraft extends PortfolioDraftSummary {
  portfolio: PortfolioStep;
}
