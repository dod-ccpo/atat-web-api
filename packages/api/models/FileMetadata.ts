import { BaseDocument } from "./BaseDocument";

export enum FileScanStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FileMetadata extends BaseDocument {
  name: string;
  size: number;
  status: FileScanStatus;
}
