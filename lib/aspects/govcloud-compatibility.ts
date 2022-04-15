import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { IConstruct } from "constructs";

/**
 * Handles property overrides and modifications that could result in
 * the synthesized CloudFormation template being incompatible with
 * the AWS GovCloud (US) regions.
 *
 * This **will** make modifications to the resources in the stack as
 * necessary.
 */
export class GovCloudCompatibilityAspect implements cdk.IAspect {
  visit(node: IConstruct): void {
    if (node instanceof logs.CfnLogGroup) {
      // The Tags property is not yet supported on AWS::Logs::LogGroup
      // resources in the GovCloud regions
      //  https://github.com/aws/aws-cdk/issues/17960
      if (node.tags) {
        cdk.Annotations.of(node).addWarning("Tags are not supported on Log Groups in GovCloud");
        node.addPropertyDeletionOverride("Tags");
      }
    }

    if (node instanceof lambda.CfnFunction) {
      // https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-lambda.html
      // We don't _really_ need to remove this because it doesn't have any impact, but it
      // provides more consistency if we do.
      if (node.tracingConfig) {
        cdk.Annotations.of(node).addWarning("Lambda X-Ray integration is not supported in GovCloud");
        node.addPropertyDeletionOverride("TracingConfig");
      }
    }
  }
}
