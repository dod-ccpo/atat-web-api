import { BaseDocument } from "./BaseDocument";

export interface FileMetadata extends BaseDocument {
    name: string;
    size: number;
    status: FileScanStatus;
}

export const enum FileScanStatus {
    Pending = "pending",
    Accepted = "accepted",
    Rejected = "rejected"
}