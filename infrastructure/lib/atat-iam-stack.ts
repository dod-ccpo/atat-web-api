import { ArnFormat, Aws, CfnOutput, Stack, StackProps, aws_iam as iam, custom_resources as custom } from "aws-cdk-lib";
import { Construct } from "constructs";

export class AtatIamStack extends Stack {
  private readonly outputs: CfnOutput[] = [];
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.templateOptions.description = "Creates the IAM permissions for ATAT developers, testers, and auditors.";

    // job-function/ReadOnlyAccess is actually a somewhat-dangerous IAM policy that
    // allows users to view sensitive data (such as Lambda environment variables or
    // some Secrets Manager Secrets). ViewOnlyAccess is more restrictive.
    // All roles will have ViewOnly access.
    const awsManagedViewOnlyPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("job-function/ViewOnlyAccess");
    const awsManagedLogsReadPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsReadOnlyAccess");
    const awsManagedAuditorPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("SecurityAudit");
    const awsManagedAdminAccessPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess");
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
          sid: "DynamoDBItemAccess",
          effect: iam.Effect.ALLOW,
          actions: ["dynamodb:*GetItem", "dynamodb:PartiQLSelect", "dynamodb:Scan", "dynamodb:Query"],
          resources: [`arn:${Aws.PARTITION}:dynamodb:*:${Aws.ACCOUNT_ID}:table/*`],
        }),
        new iam.PolicyStatement({
          sid: "APIGatewayRestApiReadAccess",
          effect: iam.Effect.ALLOW,
          actions: ["apigateway:GET"],
          resources: [`arn:${Aws.PARTITION}:apigateway:*::/restapis*`],
        }),
        new iam.PolicyStatement({
          sid: "StepFunctionsReadAccess",
          effect: iam.Effect.ALLOW,
          actions: ["states:List*", "states:Describe*", "states:GetExecutionHistory"],
          resources: [`arn:${Aws.PARTITION}:states:*:${Aws.ACCOUNT_ID}:stateMachine:*`],
        }),
        new iam.PolicyStatement({
          sid: "XRayReadAccess",
          effect: iam.Effect.ALLOW,
          actions: ["xray:BatchGetTraces", "xray:Get*", "xray:List*"],
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
          sid: "AllowArtifactReportPackageAccess",
          effect: iam.Effect.ALLOW,
          actions: ["artifact:Get"],
          resources: [`arn:${Aws.PARTITION}:artifact:::report-package/*`],
        }),
        new iam.PolicyStatement({
          sid: "AllowArtifactAgreementDownload",
          effect: iam.Effect.ALLOW,
          actions: ["artifact:DownloadAgreement"],
          resources: ["*"],
        }),
      ],
    });

    const developerRwAccess = new iam.ManagedPolicy(this, "DeveloperReadWriteAccess", {
      description: "Grants developers read/write access to necessary resources for deployments and maintenance",
      statements: [
        // Allow assuming the deployment role which will automatically be assumed by the CDK CLI during a
        // diff or deployment. This role is created/managed by the CDK Bootstrap stacks
        new iam.PolicyStatement({
          sid: "AllowCdkDeploymentRole",
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: ["deployment", "file-publishing"].map((roleName) =>
            Stack.of(this).formatArn({
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
              service: "iam",
              resource: "role",
              // IAM resources are global
              region: "",
              // hnb659fds is the default CDK Bootstrap "qualifier" and is a hardcoded, well-known
              // value. If we change the qualifier during bootstrapping, we will need to modify it here.
              // But querying for it adds additional complexities so using the hardcoded value is easiest
              // in this context.
              // See "Changing the Qualifier": https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html#bootstrapping-synthesizers
              resourceName: `cdk-hnb659fds-${roleName}-role-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
            })
          ),
        }),
      ],
    });

    const baseDenies = new iam.ManagedPolicy(this, "AtatUserDenyPolicy", {
      statements: [
        new iam.PolicyStatement({
          sid: "DenyAllOrganizations",
          effect: iam.Effect.DENY,
          actions: ["organizations:*"],
          resources: ["*"],
        }),
      ],
    });

    // Eventually, this should be restricted to the specific services in use for the application
    // rather than allowing all IAM actions. This still theoretically will give anyone who can pass
    // the role permission to do almost anything in the account; however, it at least requires that
    // it happen via CloudFormation.
    const cloudFormationExecutionRole = new iam.Role(this, "CloudFormationExecutionRole", {
      roleName: "AtatCloudFormation",
      description: "Role for deploying ATAT using CloudFormation",
      assumedBy: new iam.ServicePrincipal("cloudformation.amazonaws.com"),
      managedPolicies: [awsManagedAdminAccessPolicy, baseDenies],
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
    const managementAccountPrincipal = new iam.AccountPrincipal(managementAccountId);

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
    cloudFormationExecutionRole.grantPassRole(developerRole);

    const githubOidcProvider = new iam.OpenIdConnectProvider(this, "GithubOidc", {
      url: "https://token.actions.githubusercontent.com",
      // This thumbprint is a well-known value, documented in the
      // aws-actions/configure-aws-credentials README file
      thumbprints: ["a031c46782e6e6c662c2c87c76da9aa62ccabd8e"],
      // This client ID is specified/hardcoded into the official AWS action
      clientIds: ["sts.amazonaws.com"],
    });

    const pipelineDeploymentRole = new iam.Role(this, "DeploymentRole", {
      roleName: "AtatPipelineDeploymentRole",
      description: "Role to perform deployments from a CI/CD pipeline",
      // This provides a reasonable base set of policies but none are actually required
      // for the initial implementation which just invokes an sts:GetCallerIdentity
      // managedPolicies: [awsManagedCfnFullAccessPolicy, baseDenies],
      assumedBy: new iam.OpenIdConnectPrincipal(githubOidcProvider).withConditions({
        StringLike: {
          // Allow deployments only from the develop branch of ATAT repos under the dod-ccpo org
          "token.actions.githubusercontent.com:sub": "repo:dod-ccpo/atat-*:ref:refs/heads/develop",
        },
      }),
    });

    this.outputs.push(
      new CfnOutput(this, "QaTestRoleArnOutput", {
        exportName: "AtatQaTestRoleArn",
        value: qaAndTestRole.roleArn,
      }),
      new CfnOutput(this, "DeveloperRoleArnOutput", {
        exportName: "AtatDeveloperRoleArn",
        value: developerRole.roleArn,
      }),
      new CfnOutput(this, "AuditorRoleArnOutput", {
        exportName: "AtatAuditorRoleArn",
        value: auditorRole.roleArn,
      }),
      new CfnOutput(this, "CloudFormationRoleArn", {
        exportName: "AtatCloudFormationExecutionRoleArn",
        value: cloudFormationExecutionRole.roleArn,
      }),
      new CfnOutput(this, "DeploymentRoleArnOutput", {
        exportName: "AtatDeploymentRoleArn",
        value: pipelineDeploymentRole.roleArn,
      }),
      new CfnOutput(this, "GitHubOidcProvider", {
        exportName: "AtatGitHubOidcProvider",
        value: githubOidcProvider.openIdConnectProviderArn,
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
