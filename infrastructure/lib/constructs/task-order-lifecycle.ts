import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { SecureBucket } from "./compliant-resources";

export interface TaskOrderLifecycleProps {
  logTargetBucket: s3.IBucket;
  logTargetPrefix: string;
  bucketProps?: s3.BucketProps;
}

/**
 * Creates the infrastructure to manage the ATAT Task Order Lifecycle.
 *
 * This does not create the public API routes and functions; however, it creates the "backend"
 * parts of the architecture.
 */
export class TaskOrderLifecycle extends Construct {
  public readonly pendingBucket: SecureBucket;
  public readonly acceptedBucket: SecureBucket;
  public readonly rejectedBucket: SecureBucket;

  constructor(scope: Construct, id: string, props: TaskOrderLifecycleProps) {
    super(scope, id);
    const taskOrderBucketProps = {
      logTargetBucket: props.logTargetBucket,
      logTargetPrefix: props.logTargetPrefix,
      bucketProps: { ...props?.bucketProps },
    };
    this.pendingBucket = new SecureBucket(this, "PendingBucket", { ...taskOrderBucketProps });
    this.acceptedBucket = new SecureBucket(this, "AcceptedBucket", { ...taskOrderBucketProps });
    this.rejectedBucket = new SecureBucket(this, "RejectedBucket", { ...taskOrderBucketProps });
  }
}
