import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as AtatNet from "./atat-net-stack";

describe("ATAT network creation", () => {
  test("Flow Logs enabled", async () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new AtatNet.AtatNetStack(app, "TestNetStack", {});
    const template = Template.fromStack(stack);
    // THEN
    template.hasResourceProperties("AWS::EC2::FlowLog", {
      LogDestinationType: "cloud-watch-logs",
      ResourceType: "VPC",
      TrafficType: "ALL",
      ResourceId: stack.resolve(stack.vpc.vpcId),
    });
  });

  test("DNS Query logging enabled", async () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new AtatNet.AtatNetStack(app, "TestNetStack", {});
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
