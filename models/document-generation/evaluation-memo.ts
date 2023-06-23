import { EvalPlanMethod, EvaluationPlan, SourceSelection } from "../document-generation";

export interface IEvaluationMemo extends EvaluationPlan {
  title: string;
  estimatedValueFormatted: string;
  exceptionToFairOpportunity?: string | null; // 16.505(b)(2)(i)([A|B|C])
  proposedVendor: string;
}
