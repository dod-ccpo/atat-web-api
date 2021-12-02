import { ClinModel } from "./Clin";
import { FileMetadataSummaryModel } from "./FileMetadataSummary";
import { ExhaustivePropertyMap } from "./TypeFields";

export interface TaskOrderModel {
  task_order_number: string;
  task_order_file: FileMetadataSummaryModel;
  clins: Array<ClinModel>;
}

export const taskOrderFields: ExhaustivePropertyMap<TaskOrderModel> = {
  task_order_number: null,
  task_order_file: null,
  clins: null,
};
