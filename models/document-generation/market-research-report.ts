import { ICurrentContract } from "./requirements-checklist";
import { IFairOpportunity, IPointOfContact } from "./justification-and-approval";
import { ResearchTechnique } from "../document-generation";

export interface IResearcher {
  name: string;
  title: string;
  organization: string;
}

export interface IResearchTechnique {
  type: ResearchTechnique;
}

export interface IMarketResearchReport {
  researchers: IResearcher[];
  fairOpportunity: IFairOpportunity;
  techniquesUsed: IResearchTechnique[];
  techniqueOther: string;
  title: string;
  estimatedValue: number;
  estimatedValueFormatted: string;
  summaryOfMarketResearch: string;
  procurementHistory: ICurrentContract[];
  primaryPoc: IPointOfContact;
  corPoc: IPointOfContact;
}
