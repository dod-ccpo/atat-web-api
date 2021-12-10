import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";

/**
 * Handles property overrides and modifications that could result in
 * the synthesized CloudFormation template being incompatible with
 * the AWS GovCloud (US) regions.
 */
export class GovCloudCompatibilityAspect implements cdk.IAspect {
  visit(node: cdk.IConstruct): void {
    if (node instanceof logs.CfnLogGroup) {
      // The Tags property is not yet supported on AWS::Logs::LogGroup
      // resources in the GovCloud regions
      //  https://github.com/aws/aws-cdk/issues/17960
      node.addPropertyDeletionOverride("Tags");
    }
  }
}
