import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";

/**
 * Creates a private S3 bucket. (TODO: compliant with NIST SP 800-53 controls)
 */
export class PrivateBucket extends s3.Bucket {
  constructor(scope: cdk.Construct, id: string, props?: s3.BucketProps) {
    super(scope, id, {
      ...props,
      // Override any given props with better defaults
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: false,
      // TODO: Implement server access logging, versioning, etc
    });
  }
}
