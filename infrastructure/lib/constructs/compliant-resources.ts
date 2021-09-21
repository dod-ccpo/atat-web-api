import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";

export interface SecureBucketProps {
  logTargetBucket: s3.IBucket | "self";
  logTargetPrefix: string;
  bucketProps?: s3.BucketProps;
}

export class SecureBucket extends cdk.Construct {
  public readonly bucket: s3.IBucket;

  constructor(scope: cdk.Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    const bucket = new s3.Bucket(this, id, {
      ...props.bucketProps,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: false,
    });
    (bucket.node.defaultChild as s3.CfnBucket).loggingConfiguration = {
      logFilePrefix: props.logTargetPrefix,
      destinationBucketName: props.logTargetBucket === "self" ? bucket.bucketName : props.logTargetBucket.bucketName,
    };
    this.bucket = bucket;
  }
}
