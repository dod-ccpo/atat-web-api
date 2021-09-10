import { BaseDocument } from "./BaseDocument";
import { ProvisioningStatus } from "./ProvisioningStatus";

export interface PortfolioDraftSummary extends BaseDocument {
  name: string;
  status: ProvisioningStatus;
  num_portfolio_managers: number;
  num_applications: number;
  num_environments: number;
  num_task_orders: number;
}
