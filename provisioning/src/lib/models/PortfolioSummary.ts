import {ProvisioningStatus} from "./ProvisioningStatus";
import {BaseDocument} from "./BaseDocument";

export  interface PortfolioSummary extends BaseDocument {
    status: ProvisioningStatus
}