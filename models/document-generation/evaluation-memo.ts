import { EvalPlanMethod, SourceSelection } from "../document-generation";

export interface IEvaluationMemo {
  title: string;
  estimatedValueFormatted: string;
  exceptionToFairOpportunity?: string | null; // 16.505(b)(2)(i)([A|B|C])
  proposedVendor: string;
  // Eval Plan below
  taskOrderTitle: string;
  sourceSelection: SourceSelection;
  method: EvalPlanMethod;
  standardSpecifications: string[];
  customSpecifications: string[];
  standardDifferentiators: string[];
  customDifferentiators: string[];
}
