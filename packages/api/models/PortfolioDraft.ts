import { PortfolioDraftSummary } from "./PortfolioDraftSummary";
import { PortfolioStep } from "./PortfolioStep";
import { FundingStep } from "./FundingStep";
import { ApplicationStep } from "./ApplicationStep";

export const PORTFOLIO_STEP = "portfolio_step";
export const FUNDING_STEP = "funding_step";
export const APPLICATION_STEP = "application_step";

export interface PortfolioDraft extends PortfolioDraftSummary {
  [PORTFOLIO_STEP]: PortfolioStep;
  [FUNDING_STEP]: FundingStep;
  [APPLICATION_STEP]: ApplicationStep;
}
