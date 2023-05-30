import { ICurrentContract } from "./requirements-checklist";
import { IFairOpportunity, IPointOfContact } from "./justification-and-approval";
import { ResearchTechnique } from "../document-generation";

export interface IResearcher {
  name: string;
  title: string;
  org: string;
}

export interface IResearchTechnique {
  technique_value: ResearchTechnique;
  sequence: number;
}

export interface IMarketResearchReport {
  researchers: IResearcher[];
  fairOpportunity: IFairOpportunity;
  techniquesUsed: IResearchTechnique[];
  techniqueOther: string | null;
  title: string;
  estimatedValue: number;
  estimatedValueFormatted: string;
  summaryOfMarketResearch: string;
  procurementHistory: ICurrentContract[];
  primaryPoc: IPointOfContact;
  corPoc: IPointOfContact;
  agencyLabel: string;
  researchPersonalKnowledgePersonOrPosition: string | null;
}
