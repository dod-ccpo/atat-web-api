import { ICurrentContract } from "./requirements-checklist";
import { IJustificationAndApproval, IPointOfContact } from "./justification-and-approval";
import { ResearchTechnique } from "../document-generation";

export interface IResearcher {
  name: string;
  title: string;
  org: string;
}

export interface IResearchTechnique {
  technique_value: ResearchTechnique;
  technique_label: string;
  sequence: number;
}

export interface IMarketResearchReport {
  researchers: IResearcher[];
  justificationAndApproval: IJustificationAndApproval;
  techniquesUsed: IResearchTechnique[];
  techniqueOther?: string | null;
  title: string;
  estimatedValue: number;
  estimatedValueFormatted: string;
  summaryOfMarketResearch: string;
  procurementHistory: ICurrentContract[];
  primaryPoc: IPointOfContact;
  corPoc: IPointOfContact;
  agencyLabel: string;
  researchPersonalKnowledgePersonOrPosition?: string | null;
}
