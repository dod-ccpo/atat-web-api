import { BaseDocumentModel } from "./BaseDocument";
import { FileMetadataSummaryModel } from "./FileMetadataSummary";

export enum FileScanStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FileMetadataModel extends BaseDocumentModel, FileMetadataSummaryModel {
  size: number;
  status: FileScanStatus;
}
