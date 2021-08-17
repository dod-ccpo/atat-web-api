import { BaseDocument } from "./BaseDocument";

export const enum FileScanStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FileMetadata extends BaseDocument {
  name: string;
  size: number;
  status: FileScanStatus;
}
