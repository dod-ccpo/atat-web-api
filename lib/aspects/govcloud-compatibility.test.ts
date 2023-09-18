import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as logs from "aws-cdk-lib/aws-logs";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { GovCloudCompatibilityAspect } from "./govcloud-compatibility";

describe("Ensure the GovCloudCompatibilityAspect makes necessary changes for GovCloud", () => {
  test("that CloudWatch Log Groups have tags removed", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    // tslint:disable-next-line
    const logGroup = new logs.LogGroup(stack, "TestLogs");
    cdk.Tags.of(stack).add("Test", "Test");
    // WHEN
    cdk.Aspects.of(stack).add(new GovCloudCompatibilityAspect());
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      Tags: Match.absent(),
    });
  });

  test("that Cognito User Pools do not have Advanced Security", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const userPool = new cognito.UserPool(stack, "TestPool");
    const cfnPool = userPool.node.defaultChild as cognito.CfnUserPool;
    cfnPool.userPoolAddOns = { advancedSecurityMode: "AUDIT" };
    // WHEN
    cdk.Aspects.of(stack).add(new GovCloudCompatibilityAspect());
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolAddOns: Match.absent(),
    });
  });

  test("that using a custom domain results in an error", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const userPool = new cognito.UserPool(stack, "TestPool");
    const domain = userPool.addDomain("test", {
      customDomain: {
        domainName: "test.test.test",
        certificate: acm.Certificate.fromCertificateArn(
          stack,
          "TestCert",
          "arn:aws-us-gov:acm:us-gov-west-1:012345678901:certificate/NOT_A_REAL_CERT"
        ),
      },
    });
    // WHEN
    cdk.Aspects.of(stack).add(new GovCloudCompatibilityAspect());
    // THEN
    Annotations.fromStack(stack).hasError(
      `/${domain.node.defaultChild!.node.path}`,
      "Custom domains are not supported in GovCloud. Use a Cognito domain prefix"
    );
  });
});
