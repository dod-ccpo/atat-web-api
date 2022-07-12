import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as custom from "aws-cdk-lib/custom-resources";

import { Construct } from "constructs";

const DEFAULT_BOOSTRAP_QUALIFIER = "hnb659fds";

export class AtatIamStack extends cdk.Stack {
  private readonly outputs: cdk.CfnOutput[] = [];
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.templateOptions.description = "Creates the IAM permissions for ATAT developers, testers, and auditors.";

    // job-function/ReadOnlyAccess is actually a somewhat-dangerous IAM policy that
    // allows users to view sensitive data (such as Lambda environment variables or
    // some Secrets Manager Secrets). ViewOnlyAccess is more restrictive.
    // All roles will have ViewOnly access.
    const awsManagedViewOnlyPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("job-function/ViewOnlyAccess");
    const awsManagedLogsReadPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsReadOnlyAccess");
    const awsManagedAuditorPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("SecurityAudit");
    const awsManagedCfnFullAccessPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess");

    // In the future, we may want to consider moving to a mechanism where the various
    // resources, when created, grant access to these administrative roles rather than
    // having us globally grant access at this level. For example, at this point, it
    // is appropriate for our users to have access to read all tables directly but
    // will it always? Might we eventually store sensitive data there?
    // Eventually, many of these actions may require access to a KMS Key.
    const generalReadAccess = new iam.ManagedPolicy(this, "GeneralReadAccess", {
      description: "Grants read access to specific resources not in ViewOnlyAccess",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["apigateway:GET"],
          resources: [
            this.formatArn({
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
              service: "apigateway",
              account: "",
              resource: "restapis",
              resourceName: "*",
            }),
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["xray:Get*", "xray:List*"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["states:Describe*", "states:Get*", "states:List*"],
          resources: ["*"],
        }),
      ],
    });

    const auditorAccess = new iam.ManagedPolicy(this, "AuditorAccessPolicy", {
      description: "Grants additional security auditor access beyond SecurityAudit",
      statements: [
        // Artifact access policies generally based on those from the Artifact
        // User Guide documentation at
        // https://docs.aws.amazon.com/artifact/latest/ug/security-iam.html#example-iam-policies
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["artifact:Get", "artifact:DownloadAgreement"],
          resources: ["*"],
        }),
      ],
    });

    const developerRwAccess = new iam.ManagedPolicy(this, "DeveloperReadWriteAccess", {
      description: "Grants read/write access to developer-specific actions and resources",
      statements: [
        // During a deployment, outside of CloudFormation (where the role will be used),
        // the CDK needs to read from and write to the S3 buckets for the CDK.
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:*"],
          resources: [
            `arn:${cdk.Aws.PARTITION}:s3:::cdk-*-assets-${cdk.Aws.ACCOUNT_ID}-*`,
            `arn:${cdk.Aws.PARTITION}:s3:::cdktoolkit-stagingbucket-*`,
          ],
        }),
        // The Lookup, Deploy, and other roles will be used by the CDK and use a particular naming
        // convention
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [
            this.formatArn({
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
              service: "iam",
              region: "",
              resource: "role",
              resourceName: `cdk-${DEFAULT_BOOSTRAP_QUALIFIER}-*-role-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            }),
          ],
        }),
        // Additionally, values under the `cdk-bootstrap/` namespace for the qualifier may be necessary
        // for the CDK to understand the environment and do a deployment
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ssm:GetParameter"],
          resources: [
            this.formatArn({
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
              service: "ssm",
              resource: "parameter",
              region: "*",
              resourceName: `cdk-bootstrap/${DEFAULT_BOOSTRAP_QUALIFIER}/*`,
            }),
          ],
        }),
        // Within ATAT, developers may need to read from various queues in order to debug or
        // troubleshoot
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sqs:Get*", "sqs:List*"],
          resources: ["*"],
        }),
        // Grant access to read the pipeline state
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "codebuild:BatchGet*",
            "codebuild:Describe*",
            "codebuild:Get*",
            "codebuild:List*",
            "codepipeline:Get*",
            "codepipeline:List*",
          ],
          resources: ["*"],
        }),
        // This allows listing/viewing functions in the AWS console
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["lambda:List*", "lambda:GetAccountSettings", "lambda:GetFunction"],
          resources: ["*"],
        }),
        // Allow developers to describe APIs
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["apigateway:GET"],
          resources: [
            ...["account", "restapis"].map((resourceType) =>
              this.formatArn({
                arnFormat: cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
                service: "apigateway",
                account: "",
                resource: resourceType,
              })
            ),
            this.formatArn({
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
              service: "apigateway",
              account: "",
              resource: "restapis",
              resourceName: "*",
            }),
          ],
        }),
        // Allow developers to manually re-deploy, which may be necessary as a troubleshooting step
        // as CloudFormation does not always trigger a deployment itself.
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["apigateway:POST"],
          resources: [
            this.formatArn({
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
              service: "apigateway",
              account: "",
              resource: "restapis",
              resourceName: `*/deployments`,
            }),
          ],
        }),
      ],
    });

    const baseDenies = new iam.ManagedPolicy(this, "AtatUserDenyPolicy", {
      description: "Denies access to sensitive resources and actions",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["organizations:*"],
          resources: ["*"],
        }),
      ],
    });

    const managementAccountId = this.findOrganizationManagementAccount();
    // This is currently used as the trust principal to assume the various roles. This
    // means that _any_ IAM principal in the management account could theoretically
    // assume this role. We can either:
    //  - limit access to assume this role in the management account by only
    //    granting groups sts:AssumeRole to the specific role that they need to use
    //  - change this to trusting a specific role in the Management Account which
    //    is better would require users to possible "double hop" from their User
    //    to role in the management account and then to this role.
    // For now, keeping it where any user can assume any of the roles in dev/sandbox
    // makes it easier for any user to see what another user sees. This will need to
    // be totally refactored when we introduce Identity Federation for IAM anyway.
    const managementAccountPrincipal = new iam.AccountPrincipal(managementAccountId).withConditions({
      // Require that the user assuming the role uses their own username as the
      // RoleSessionName, making it easier to review logs
      StringLike: {
        // `${aws:username}` is the literal value that we want to use within the string
        // therefore, we need to _not_ use a template. This is a false-positive from the
        // ESLint rule.
        // eslint-disable-next-line no-template-curly-in-string
        "sts:RoleSessionName": "${aws:username}",
      },
    });

    // Allow read access to all "safe" resources from AWS as well as those read-only
    // APIs that we have considered to be safe.
    const qaAndTestRole = new iam.Role(this, "QaTestingRole", {
      roleName: "AtatQa",
      description: "ATAT QA Team",
      assumedBy: managementAccountPrincipal,
      managedPolicies: [awsManagedViewOnlyPolicy, generalReadAccess, baseDenies],
    });
    // Allow read access to all things our other users have as well as the permissions
    // defined in the AWS-managed SecurityAudit policy.
    const auditorRole = new iam.Role(this, "SecurityAuditorRole", {
      roleName: "AtatSecurityAuditor",
      description: "ATAT Security Auditors",
      assumedBy: managementAccountPrincipal,
      managedPolicies: [
        awsManagedViewOnlyPolicy,
        awsManagedLogsReadPolicy,
        awsManagedAuditorPolicy,
        generalReadAccess,
        auditorAccess,
        baseDenies,
      ],
    });
    // Developers have all the read access of QA and Testing and the ability to pass
    // the CloudFormation execution role and read all logs in CloudWatch.
    const developerRole = new iam.Role(this, "DeveloperRole", {
      roleName: "AtatDeveloper",
      description: "ATAT DevSecOps access",
      assumedBy: managementAccountPrincipal,
      managedPolicies: [
        awsManagedViewOnlyPolicy,
        generalReadAccess,
        awsManagedLogsReadPolicy,
        awsManagedCfnFullAccessPolicy,
        developerRwAccess,
        baseDenies,
      ],
    });

    this.outputs.push(
      new cdk.CfnOutput(this, "QaTestRoleArnOutput", {
        exportName: "AtatQaTestRoleArn",
        value: qaAndTestRole.roleArn,
      }),
      new cdk.CfnOutput(this, "DeveloperRoleArnOutput", {
        exportName: "AtatDeveloperRoleArn",
        value: developerRole.roleArn,
      }),
      new cdk.CfnOutput(this, "AuditorRoleArnOutput", {
        exportName: "AtatAuditorRoleArn",
        value: auditorRole.roleArn,
      })
    );
  }

  private findOrganizationManagementAccount(): string {
    // - We could require the management account ID to be made available either through
    //   a configuration or the context; however, that feels unnecessarily complex and
    //   may result in account IDs accidentally getting checked in to version control.
    //   By dynamically querying for it when we build the stack, we also make it so that
    //   the stack can be re-used in different places onces synthesized.
    //   Because this ID is not provided via SSM and because the CDK itself doesn't give
    //   any better way to identify the Organization we're a member of, this custom
    //   resource to invoke the single organizations:DescribeOrganization API is our best
    //   bet to find that information.
    // - The API still refers to the field as the "MasterAccountId"; however, much of
    //   the AWS Organizations documentation has been updated to use the term
    //   "management account".
    const organizationManagementAccountFinderResource = new custom.AwsCustomResource(
      this,
      "OrganizationManagementAccount",
      {
        onCreate: {
          // service and action take the form of the client and method from the
          // AWS SDK for JavaScript v2 (so basically, uppercase name for service
          // and camelCase names for action)
          service: "Organizations",
          action: "describeOrganization",
          // Mapping to the Organization.MasterAccountId field ensures that the
          // custom "resource" gets "replaced" if the account changes for any
          // reason
          physicalResourceId: custom.PhysicalResourceId.fromResponse("Organization.MasterAccountId"),
        },
        policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
          // Using ANY_RESOURCE is required since we do not know the ID/ARN of the
          // Organization we are querying (that's the whole reason why we have to
          // invoke this API in the first place)
          resources: custom.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      }
    );

    return organizationManagementAccountFinderResource.getResponseField("Organization.MasterAccountId");
  }
}
