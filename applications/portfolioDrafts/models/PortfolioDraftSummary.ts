import { BaseDocument } from "./BaseDocument";
import { ProvisioningStatus } from "./ProvisioningStatus";

export interface PortfolioDraftSummary extends BaseDocument {
  status: ProvisioningStatus;
}
