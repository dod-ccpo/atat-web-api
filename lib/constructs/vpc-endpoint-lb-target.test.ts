import { Match, Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2Targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as vpceLb from "./vpc-endpoint-lb-target";

describe("VPC Endpoint Application Load Balancer Target Group", () => {
  it("sets the Targets property to an object", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    const template = Template.fromStack(stack);
    // THEN
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      TargetType: "ip",
      Targets: Match.objectLike({
        "Fn::GetAtt": Match.anyValue(),
      }),
    });
  });

  it("rejects the `targets` property", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointApplicationTargetGroupProps = {
      endpoint,
      vpc,
      targets: [],
    };
    // THEN
    expect(() => new vpceLb.VpcEndpointApplicationTargetGroup(stack, "TestGroup", props)).toThrow(
      "Additional targets are not supported for VPC Endpoint Target Groups"
    );
  });

  it.each([elbv2.TargetType.INSTANCE, elbv2.TargetType.LAMBDA])(
    "rejects the `targetType` property when not IP",
    async (targetType) => {
      // GIVEN
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "TestStack");
      const vpc = new ec2.Vpc(stack, "TestVpc");
      const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      });
      // WHEN
      const props: vpceLb.VpcEndpointApplicationTargetGroupProps = {
        endpoint,
        vpc,
        targetType,
      };
      // THEN
      expect(() => new vpceLb.VpcEndpointApplicationTargetGroup(stack, "TestGroup", props)).toThrow(
        "targetType is not a supported property for VPC Endpoint Target Groups"
      );
    }
  );

  it("accepts a `targetType` of IP", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointApplicationTargetGroupProps = {
      endpoint,
      vpc,
      targetType: elbv2.TargetType.IP,
    };
    // THEN
    expect(() => new vpceLb.VpcEndpointApplicationTargetGroup(stack, "TestGroup", props)).not.toThrow(
      "targetType is not a supported property for VPC Endpoint Target Groups"
    );
  });

  it("refuses to add additional targets", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointApplicationTargetGroupProps = {
      endpoint,
      vpc,
    };
    const testTarget = new elbv2Targets.IpTarget("192.0.2.15", 443, "us-gov-west-1a");
    const targetGroup = new vpceLb.VpcEndpointApplicationTargetGroup(stack, "TestGroup", props);
    // THEN
    expect(() => targetGroup.addTarget(testTarget)).toThrow(
      "Additional targets are not supported for VpcEndpointApplicationTargetGroup"
    );
  });

  it("attaches to an ApplicationLoadBalancer listener", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    const alb = new elbv2.ApplicationLoadBalancer(stack, "TestAlb", { vpc });
    const listener = alb.addListener("TestListener", {
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [
        acm.Certificate.fromCertificateArn(
          stack,
          "TestCert",
          "arn:aws:acm:us-east-1:123456789012:certificate/5a599241-1617-4b3c-9d4a-1d48a90d72a8"
        ),
      ],
    });
    // WHEN
    const targetGroup = new vpceLb.VpcEndpointApplicationTargetGroup(stack, "TestGroup", {
      endpoint,
      vpc,
    });
    listener.addTargetGroups("TestTargetAssoc", {
      targetGroups: [targetGroup],
    });
    const template = Template.fromStack(stack);
    const targetGroupArn = stack.resolve(targetGroup.targetGroupArn);
    // THEN
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      DefaultActions: Match.arrayWith([
        Match.objectLike({
          TargetGroupArn: targetGroupArn,
        }),
      ]),
    });
  });
});

describe("VPC Endpoint Network Load Balancer Target Group", () => {
  it("sets the Targets property to an object", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    const template = Template.fromStack(stack);
    // THEN
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      TargetType: "ip",
      Targets: Match.objectLike({
        "Fn::GetAtt": Match.anyValue(),
      }),
    });
  });

  it("rejects the `targets` property", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointNetworkTargetGroupProps = {
      endpoint,
      vpc,
      port: 443,
      targets: [],
    };
    // THEN
    expect(() => new vpceLb.VpcEndpointNetworkTargetGroup(stack, "TestGroup", props)).toThrow(
      "Additional targets are not supported for VPC Endpoint Target Groups"
    );
  });

  it.each([elbv2.TargetType.INSTANCE, elbv2.TargetType.LAMBDA])(
    "rejects the `targetType` property when not IP",
    async (targetType) => {
      // GIVEN
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "TestStack");
      const vpc = new ec2.Vpc(stack, "TestVpc");
      const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      });
      // WHEN
      const props: vpceLb.VpcEndpointNetworkTargetGroupProps = {
        endpoint,
        vpc,
        targetType,
        port: 443,
      };
      // THEN
      expect(() => new vpceLb.VpcEndpointNetworkTargetGroup(stack, "TestGroup", props)).toThrow(
        "targetType is not a supported property for VPC Endpoint Target Groups"
      );
    }
  );

  it("accepts a `targetType` of IP", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointNetworkTargetGroupProps = {
      endpoint,
      vpc,
      targetType: elbv2.TargetType.IP,
      port: 443,
    };
    // THEN
    expect(() => new vpceLb.VpcEndpointNetworkTargetGroup(stack, "TestGroup", props)).not.toThrow(
      "targetType is not a supported property for VPC Endpoint Target Groups"
    );
  });

  it("refuses to add additional targets", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    // WHEN
    const props: vpceLb.VpcEndpointNetworkTargetGroupProps = {
      endpoint,
      vpc,
      port: 443,
    };
    const testTarget = new elbv2Targets.IpTarget("192.0.2.15", 443, "us-gov-west-1a");
    const targetGroup = new vpceLb.VpcEndpointNetworkTargetGroup(stack, "TestGroup", props);
    // THEN
    expect(() => targetGroup.addTarget(testTarget)).toThrow(
      "Additional targets are not supported for VpcEndpointNetworkTargetGroup"
    );
  });

  it("attaches to an ApplicationLoadBalancer listener", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestVpc");
    const endpoint = vpc.addInterfaceEndpoint("TestEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });
    const alb = new elbv2.NetworkLoadBalancer(stack, "TestAlb", { vpc });
    const listener = alb.addListener("TestListener", {
      protocol: elbv2.Protocol.TLS,
      port: 443,
      certificates: [
        acm.Certificate.fromCertificateArn(
          stack,
          "TestCert",
          "arn:aws:acm:us-east-1:123456789012:certificate/5a599241-1617-4b3c-9d4a-1d48a90d72a8"
        ),
      ],
    });
    // WHEN
    const targetGroup = new vpceLb.VpcEndpointNetworkTargetGroup(stack, "TestGroup", {
      endpoint,
      vpc,
      port: 443,
      protocol: elbv2.Protocol.TLS,
    });
    listener.addTargetGroups("TestTargetAssoc", targetGroup);
    const template = Template.fromStack(stack);
    const targetGroupArn = stack.resolve(targetGroup.targetGroupArn);
    // THEN
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      DefaultActions: Match.arrayWith([
        Match.objectLike({
          TargetGroupArn: targetGroupArn,
        }),
      ]),
    });
  });
});
