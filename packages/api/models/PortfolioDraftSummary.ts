import { ApplicationStep } from "./ApplicationStep";
import { BaseDocument } from "./BaseDocument";
import { FundingStep } from "./FundingStep";
import { PortfolioStep } from "./PortfolioStep";
import { ProvisioningStatus } from "./ProvisioningStatus";

export interface PortfolioDraftSummary extends BaseDocument {
  status: ProvisioningStatus;
  name: string;
  num_portfolio_managers: number;
  num_task_orders: number;
  num_applications: number;
  num_environments: number;
}
