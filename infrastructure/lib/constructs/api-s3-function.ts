import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "../http";
import { ApiFunction, ApiFunctionProps } from "./api-function";
import { SecureBucket } from "./compliant-resources";

export interface ApiS3FunctionProps extends ApiFunctionProps {
  readonly bucket: SecureBucket;
}

export class ApiS3Function extends ApiFunction {
  public readonly bucket: s3.IBucket;

  constructor(scope: cdk.Construct, id: string, props: ApiS3FunctionProps) {
    super(scope, id, props);
    this.bucket = props.bucket.bucket;
    this.fn.addEnvironment("DATA_BUCKET", this.bucket.bucketName);
    this.grantRequiredBucketPermissions();
  }

  private grantRequiredBucketPermissions(): iam.Grant | undefined {
    switch (this.method) {
      case HttpMethod.GET:
      case HttpMethod.HEAD:
        return this.bucket.grantRead(this.fn);
      case HttpMethod.POST:
      case HttpMethod.PUT:
        return this.bucket.grantPut(this.fn);
      case HttpMethod.DELETE:
        return this.bucket.grantDelete(this.fn);
      default:
        // This will allow Synthesis to continue; however, the error will stop the
        // CDK from moving forward with a diff or deploy action.
        cdk.Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
  }
}
