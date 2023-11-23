import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as AtatNet from "./atat-net-stack";

describe("ATAT network creation", () => {
  test("Flow Logs enabled", async () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new AtatNet.AtatNetStack(app, "TestNetStack", {
      tgwEventBus: "arn:aws:us-east-1:event:12345678910:test",
    });
    const template = Template.fromStack(stack);
    // THEN
    template.hasResourceProperties("AWS::EC2::FlowLog", {
      LogDestinationType: "cloud-watch-logs",
      ResourceType: "VPC",
      TrafficType: "ALL",
      ResourceId: stack.resolve(stack.vpc.vpcId),
    });
  });

  test.skip("DNS Query logging enabled", async () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new AtatNet.AtatNetStack(app, "TestNetStack", {
      vpcFlowLogBucket: "arn:aws:us-east-1:s3::123456789012:flow-logs-123456789012-us-east-1",
      tgwEventBus: "arn:aws:us-east-1:event:12345678910:test",
    });
    const template = Template.fromStack(stack);
    // THEN
    template.hasResourceProperties("AWS::Route53Resolver::ResolverQueryLoggingConfig", {
      DestinationArn: Match.anyValue(),
    });
    template.hasResourceProperties("AWS::Route53Resolver::ResolverQueryLoggingConfigAssociation", {
      ResolverQueryLogConfigId: Match.anyValue(),
      ResourceId: stack.resolve(stack.vpc.vpcId),
    });
  });
});
