import { PortfolioStep } from "./PortfolioStep";
import { PortfolioSummary } from "./PortfolioSummary";

export interface PortfolioFull extends PortfolioSummary {
  portfolio: PortfolioStep;
}
