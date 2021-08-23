import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";
import { PrivateBucket } from "./compliant-resources";

export interface TaskOrderLifecycleProps {
  bucketProps?: s3.BucketProps;
}

/**
 * Creates the infrastructure to manage the ATAT Task Order Lifecycle.
 *
 * This does not create the public API routes and functions; however, it creates the "backend"
 * parts of the architecture.
 */
export class TaskOrderLifecycle extends cdk.Construct {
  public readonly pendingBucket: PrivateBucket;
  public readonly acceptedBucket: PrivateBucket;
  public readonly rejectedBucket: PrivateBucket;

  constructor(scope: cdk.Construct, id: string, props?: TaskOrderLifecycleProps) {
    super(scope, id);
    this.pendingBucket = new PrivateBucket(this, "PendingBucket", { ...props?.bucketProps });
    this.acceptedBucket = new PrivateBucket(this, "AcceptedBucket", { ...props?.bucketProps });
    this.rejectedBucket = new PrivateBucket(this, "RejectedBucket", { ...props?.bucketProps });
  }
}
