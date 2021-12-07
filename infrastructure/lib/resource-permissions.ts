/**
 * Supported Bucket Permissions for the application.
 */
export enum BucketPermissions {
  READ = "READ",
  PUT = "PUT",
  DELETE = "DELETE",
}

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
  READ = 1 << 0,
  WRITE = 1 << 1,
  ADMINISTER = 1 << 2,
  READ_WRITE = TablePermissions.READ | TablePermissions.WRITE,
}
