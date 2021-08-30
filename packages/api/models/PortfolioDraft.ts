import { PortfolioDraftSummary } from "./PortfolioDraftSummary";
import { PortfolioStep } from "./PortfolioStep";
import { FundingStep } from "./FundingStep";
import { ApplicationStep } from "./ApplicationStep";

export interface PortfolioDraft extends PortfolioDraftSummary {
  portfolio_step: PortfolioStep;
  funding_step: FundingStep;
  application_step: ApplicationStep;
}
