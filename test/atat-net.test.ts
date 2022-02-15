import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import * as AtatNet from "../lib/atat-net-stack";

describe("ATAT network creation", () => {
  test("Flow Logs enabled", async () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new AtatNet.AtatNetStack(app, "TestNetStack", {});
    const template = Template.fromStack(stack);
    // THEN
    template.resourceCountIs("AWS::Logs::LogGroup", 1);
    template.hasResourceProperties("AWS::EC2::FlowLog", {
      LogDestinationType: "cloud-watch-logs",
      ResourceType: "VPC",
      TrafficType: "ALL"
    });
  });
});
