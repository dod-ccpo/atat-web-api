import { EvaluationPlan } from "../document-generation";

export interface IEvaluationMemo extends EvaluationPlan {
  title: string;
  estimatedValueFormatted: string;
  exceptionToFairOpportunity: boolean; // true for YES values, false for NO_NONE
  proposedVendor: string;
}
