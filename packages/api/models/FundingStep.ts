import { Clin } from "./Clin";
import { CloudServiceProvider } from "./CloudServiceProvider";
import { FileMetadataSummary } from "./FileMetadataSummary";

export enum ValidationMessage {
  START_VALID = "start date must be a valid date",
  END_VALID = "end date must be a valid date",
  START_BEFORE_END = "start date must be before end date",
  END_FUTURE = "end date must be in the future",
  INVALID_FUNDING_AMOUNT = "funding amount must be numbers and amount must be greater than zero",
  TOTAL_GT_OBLIGATED = "total clin value must be greater than obligated funds",
  INVALID_CLIN_NUMBER = "clin number must be four numbers and in range 0001 through 9999",
}

export interface FundingStep {
  task_order_number: string;
  task_order_file: FileMetadataSummary;
  csp: CloudServiceProvider;
  clins: Array<Clin>;
}
