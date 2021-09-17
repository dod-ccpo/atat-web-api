import { Clin } from "./Clin";
import { CloudServiceProvider } from "./CloudServiceProvider";
import { FileMetadataSummary } from "./FileMetadataSummary";

export interface TaskOrder {
  task_order_number: string;
  task_order_file: FileMetadataSummary;
  csp: CloudServiceProvider;
  clins: Array<Clin>;
}
