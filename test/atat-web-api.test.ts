import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import * as AtatWebApi from "../lib/atat-web-api-stack";

test("Rest API is created", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AtatWebApi.AtatWebApiStack(app, "TestStack");
  // THEN
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
});
