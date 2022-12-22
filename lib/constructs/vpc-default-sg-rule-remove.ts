import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export interface VpcDefaultSecurityGroupRuleRemoverProps {
  /**
   * The VPC that should have is default SG rules removed, as well as where
   * the backing custom resource should be deployed.
   */
  // This has to accept the concrete class because we need the VPC and
  // attributes only available on the concrete class.
  readonly vpc: ec2.Vpc;
}

/**
 * A Construct for removing all rules from a given VPC's default Security Group.
 *
 * This may be necessary in some environments to meet compliance requirements. All the
 * rules on the VPC's default Security Group will be deleted (Ingress and Egress). Therefore,
 * any ENI in this Security Group will not be able to send or receive traffic unless granted
 * by another Security Group.
 *
 * Constructs that add rules to the VPC's default Security Group should depend on this if
 * those rules should be kept; otherwise, this should depend on any constructs that create
 * rules on the default Security Group that should be deleted.
 *
 * This is implemented as a custom resource in a VPC. It will need network access to make
 * EC2 and S3 API calls, as well as possibly CloudFormation.
 */
export class VpcDefaultSecurityGroupRuleRemover extends Construct {
  constructor(scope: Construct, id: string, props: VpcDefaultSecurityGroupRuleRemoverProps) {
    super(scope, id);

    const handler = new nodejs.NodejsFunction(this, "VpcSgRuleRemovalHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: "lib/custom-resources/delete-default-sg-rules.ts",
      handler: "onEvent",
      vpc: props.vpc,
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:DescribeSecurityGroupRules"],
          // Describe has to be allowed on all VPCs in order to perform the filter
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["ec2:RevokeSecurityGroupIngress", "ec2:RevokeSecurityGroupEgress"],
          // Only allow changing rules on the default security group
          resources: [
            cdk.Stack.of(this).formatArn({
              service: "ec2",
              resource: "security-group",
              resourceName: props.vpc.vpcDefaultSecurityGroup,
              arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
            }),
          ],
        }),
      ],
      tracing: lambda.Tracing.ACTIVE,
    });
    const vpcEndpointIpProvider = new cr.Provider(this, "VpcSgRuleRemovalProvider", {
      onEventHandler: handler,
      vpc: props.vpc,
    });
    const customResource = new cdk.CustomResource(this, "VpcSgRuleRemoval", {
      serviceToken: vpcEndpointIpProvider.serviceToken,
      properties: {
        // Do not pass any other Security Group here. The underlying handler will
        // actually happily delete rules from any Security Group and this construct
        // is the only thing that safely applies this to only the default Security Group.
        DefaultSecurityGroupId: props.vpc.vpcDefaultSecurityGroup,
      },
    });
  }
}
