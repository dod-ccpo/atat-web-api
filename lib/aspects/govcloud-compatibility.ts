import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { IConstruct } from "constructs";

/**
 * Handles property overrides and modifications that could result in
 * the synthesized CloudFormation template being incompatible with
 * the AWS GovCloud (US) regions.
 *
 * This **will** make modifications to the resources in the stack as
 * necessary. If a modifications cannot be made, then an Error annotation
 * will be added to the node; this may result in synthesis failures, but
 * that is better than a deployment-time failure in nearly all cases.
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

    if (node instanceof cognito.CfnUserPool) {
      // Advanced Security is the only Cognito User Pool Add On and if the field is present
      // at all, regardless of its value, it will fail during deployment.
      // https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-cog.html
      if (node.userPoolAddOns) {
        cdk.Annotations.of(node).addWarning("Cognito Advanced Security is not supported in GovCloud");
        node.addPropertyDeletionOverride("UserPoolAddOns");
      }
    }

    if (node instanceof cognito.CfnUserPoolDomain) {
      // The `customDomainConfig` is the configuration object for a custom domain,
      // which is not supported in GovCloud. There is no easy remediation here and we
      // should error.
      // https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-cog.html
      if (node.customDomainConfig) {
        cdk.Annotations.of(node).addError("Custom domains are not supported in GovCloud. Use a Cognito domain prefix");
      }
    }
  }
}
