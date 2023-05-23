import { IPeriodOfPerformance } from "../document-generation";
import { ICurrentContract } from "./requirements-checklist";

export interface IFairOpportunity {
  procurementDiscussion: string;
  procurementPreviousImpact?: string | null;
  marketResearchDetails: string;
  causeOfSoleSourceSituation: string;
  procurementHasExistingEnv: boolean;
  minimumGovernmentRequirements: string;
  plansToRemoveBarriers: string;
  requirementImpact?: string | null;
  exceptionToFairOpportunity: string;
  otherFactsToSupportLogicalFollowOn?: string | null;
  whyCspIsOnlyCapableSource?: string | null;
  proposedVendor: string;
  justification: string;
}

export interface IPointOfContact {
  formalName: string;
  phoneAndExtension?: string | null;
  title?: string | null;
}

export interface IJustificationAndApproval {
  fairOpportunity: IFairOpportunity;
  cor: IPointOfContact;
  technicalPoc: IPointOfContact;
  requirementsPoc: IPointOfContact;
  periodOfPerformance: IPeriodOfPerformance;
  procurementHistory: ICurrentContract[];
  fundingRequestFiscalYear: string;
  otherContractingShopFullAddress?: string | null;
  title: string;
  jwccContractNumber: string;
  estimatedValue: string;
  organizationFullAddress: string;
  scope: string;
  contractingShop: string;
  purchaseRequestNumber: string;
  agencyLabel: string;
  taskOrderType: string;
}
