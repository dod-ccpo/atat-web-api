import { BaseDocument } from "./BaseDocument";
import { ProvisioningStatus } from "./ProvisioningStatus";

export interface PortfolioSummary extends BaseDocument {
  status: ProvisioningStatus;
}
