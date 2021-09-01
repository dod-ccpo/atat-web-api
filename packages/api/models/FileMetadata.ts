import { BaseDocument } from "./BaseDocument";
import { FileMetadataSummary } from "./FileMetadataSummary";

export enum FileScanStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FileMetadata extends BaseDocument, FileMetadataSummary {
  size: number;
  status: FileScanStatus;
}
