import { ApplicationStep } from "./ApplicationStep";
import { BaseDocument } from "./BaseDocument";
import { FundingStep } from "./FundingStep";
import { PortfolioStep } from "./PortfolioStep";
import { ProvisioningStatus } from "./ProvisioningStatus";

export interface PortfolioDraftSummary extends BaseDocument {
  status: ProvisioningStatus;
  portfolio_name?: string;
  portfolio_step?: PortfolioStep;
  num_portfolio_managers?: number;
  funding_step?: FundingStep;
  num_task_orders?: number;
  application_step?: ApplicationStep;
  num_applications?: number;
  num_environments?: number;
}
