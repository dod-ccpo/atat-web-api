import { Clin } from "./Clin";
import { FileMetadataSummary } from "./FileMetadataSummary";
import { ExhaustivePropertyMap } from "./TypeFields";

export interface TaskOrder {
  task_order_number: string;
  task_order_file: FileMetadataSummary;
  clins: Array<Clin>;
}

export const taskOrderFields: ExhaustivePropertyMap<TaskOrder> = {
  task_order_number: null,
  task_order_file: null,
  clins: null,
};
