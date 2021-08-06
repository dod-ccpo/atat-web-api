import { PortfolioStep } from "./PortfolioStep";
import { PortfolioSummary } from "./PortfolioSummary";

export interface PortfolioDraft extends PortfolioSummary {
  portfolio: PortfolioStep;
}
