import { ApplicationStep } from "./ApplicationStep";
import { ExhaustivePropertyMap } from "./TypeFields";
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

export const portfolioDraftProperties: ExhaustivePropertyMap<PortfolioDraft> = {
  // BaseDocument properties
  id: null,
  created_at: null,
  updated_at: null,
  // PortfolioDraftSummary properties
  status: null,
  name: null,
  description: null,
  num_portfolio_managers: null,
  num_task_orders: null,
  num_applications: null,
  num_environments: null,
  // PortfolioDraft properties
  [PORTFOLIO_STEP]: null,
  [FUNDING_STEP]: null,
  [APPLICATION_STEP]: null,
};
