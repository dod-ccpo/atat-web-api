import { ProvisioningStatus } from "./ProvisioningStatus";
import { BaseDocument } from "./BaseDocument";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

export interface PortfolioSummary extends BaseDocument {
  status: ProvisioningStatus;
}
