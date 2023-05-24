import { IFairOpportunity } from "./justification-and-approval";
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
  title: string;
  estimatedValue: number;
  estimatedValueFormatted: string;
  // TODO finish definition
}
