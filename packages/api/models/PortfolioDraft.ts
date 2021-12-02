import { ApplicationStepModel } from "./ApplicationStep";
import { ExhaustivePropertyMap } from "./TypeFields";
import { FundingStepModel } from "./FundingStep";
import { PortfolioDraftSummaryModel } from "./PortfolioDraftSummary";
import { PortfolioStepModel } from "./PortfolioStep";

export const PORTFOLIO_STEP = "portfolio_step";
export const FUNDING_STEP = "funding_step";
export const APPLICATION_STEP = "application_step";

export interface PortfolioDraftModel extends PortfolioDraftSummaryModel {
  [PORTFOLIO_STEP]: PortfolioStepModel;
  [FUNDING_STEP]: FundingStepModel;
  [APPLICATION_STEP]: ApplicationStepModel;
}

export const portfolioDraftProperties: ExhaustivePropertyMap<PortfolioDraftModel> = {
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
