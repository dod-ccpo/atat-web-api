import { ApplicationStep } from "./ApplicationStep";
import { FundingStep } from "./FundingStep";
import { PortfolioDraftSummary } from "./PortfolioDraftSummary";
import { PortfolioStep } from "./PortfolioStep";

export const PORTFOLIO_STEP = "portfolio_step";
export const FUNDING_STEP = "funding_step";
export const APPLICATION_STEP = "application_step";

export interface PortfolioDraft extends PortfolioDraftSummary {
  [PORTFOLIO_STEP]: PortfolioStep;
  [FUNDING_STEP]: FundingStep;
  [APPLICATION_STEP]: ApplicationStep;
}
