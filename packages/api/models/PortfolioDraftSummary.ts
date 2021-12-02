import { BaseDocumentModel } from "./BaseDocument";
import { ProvisioningStatus } from "./ProvisioningStatus";
import { ExhaustivePropertyMap } from "./TypeFields";

export interface PortfolioDraftSummaryModel extends BaseDocumentModel {
  status: ProvisioningStatus;
  name: string;
  description: string;
  num_portfolio_managers: number;
  num_task_orders: number;
  num_applications: number;
  num_environments: number;
}

export const portfolioDraftSummaryProperties: ExhaustivePropertyMap<PortfolioDraftSummaryModel> = {
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
};
