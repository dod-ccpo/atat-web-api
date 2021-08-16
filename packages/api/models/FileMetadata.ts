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

export class S3FileMetadata implements FileMetadata {

    id: string;
    name: string;
    size: number;
    status: FileScanStatus;
    created_at: string;
    updated_at: string;

    constructor(id: string, name: string, size: number, status: FileScanStatus, created_at: string, updated_at: string) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.status = status;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

}