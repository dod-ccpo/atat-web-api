/**
 * Supported Queue Permissions for the application.
 */
export enum QueuePermissions {
  SEND = "SEND",
  CONSUME = "CONSUME",
}

/**
 * Supported Table Permissions for the application.
 */
export enum TablePermissions {
  ALL = "ALL",
  READ = "READ",
  READ_WRITE = "READ_WRITE",
  WRITE = "WRITE",
}

/**
 * Supported permissions on an S3 bucket.
 */
export enum BucketPermissions {
  READ = "READ",
  PUT = "PUT",
  DELETE = "DELETE",
}
