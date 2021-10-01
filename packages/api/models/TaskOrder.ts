import { Clin } from "./Clin";
import { CloudServiceProvider } from "./CloudServiceProvider";
import { FileMetadataSummary } from "./FileMetadataSummary";
import { ExhaustiveAttributeMap } from "./TypeFields";

export interface TaskOrder {
  task_order_number: string;
  task_order_file: FileMetadataSummary;
  csp: CloudServiceProvider;
  clins: Array<Clin>;
}

export const taskOrderFields: ExhaustiveAttributeMap<TaskOrder> = {
  task_order_number: null,
  task_order_file: null,
  csp: null,
  clins: null,
};
