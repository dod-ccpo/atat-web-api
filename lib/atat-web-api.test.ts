import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AtatNetStack } from "./atat-net-stack";
import * as AtatWebApi from "./atat-web-api-stack";

test("Rest API is created", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "TestStack", { environmentName: "At0000" });
  // THEN
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
});

test("The stack creates successfully with a VPC defined", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const network = new AtatNetStack(app, "TestNetStack", {
    vpcFlowLogBucket: "arn:aws:us-east-1:s3::123456789012:flow-logs-123456789012-us-east-1",
  });
  const stack = new AtatWebApi.AtatWebApiStack(app, "TestStack", { environmentName: "At0000", network });
  // THEN
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
});
