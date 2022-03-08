import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { User } from "aws-cdk-lib/aws-iam";
import { AtatRestApi, RestApiVpcConfiguration } from "../lib/constructs/apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";

describe("ATAT apigateway construct creation", () => {
  test("Ensure AtatRestApi is created", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApigw = new AtatRestApi(stack, "SampleApi");
    testApigw.restApi.root.addMethod("ANY");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
  });

  test("Ensure grantOnRoute method properly generates IAM policy with execute-api:Invoke action", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApigw = new AtatRestApi(stack, "SampleApi");
    testApigw.restApi.root.addMethod("ANY");
    const testUser = new User(stack, "testUser");
    testApigw.grantOnRoute(testUser, "*", "/");
    // THEN
    const template = Template.fromStack(stack);
    // template.hasResourceProperties("AWS::IAM::Policy", {});
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.objectLike({
        PolicyDocument: {
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Allow",
            },
          ],
          Version: "2012-10-17",
        },
      })
    );
  });

  test("Ensures AtatRestApi with vpcConfig in props properly sets EndpointConfiguration to PRIVATE", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const vpc = new cdk.aws_ec2.Vpc(stack, "TestVpc", {});
    const interfaceEndpoint = new cdk.aws_ec2.InterfaceVpcEndpoint(stack, "Test VPC Endpoint", {
      vpc,
      service: new ec2.InterfaceVpcEndpointService("test service", 443),
    });
    const vpcConfig = { vpc, interfaceEndpoint } as RestApiVpcConfiguration;
    const testApigw = new AtatRestApi(stack, "SampleApi", { vpcConfig });
    testApigw.restApi.root.addMethod("ANY");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties(
      "AWS::ApiGateway::RestApi",
      Match.objectLike({
        EndpointConfiguration: {
          Types: ["PRIVATE"],
        },
        Policy: {
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Allow",
              Principal: {
                AWS: {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition",
                      },
                      ":iam::",
                      {
                        Ref: "AWS::AccountId",
                      },
                      ":root",
                    ],
                  ],
                },
              },
              Resource: "execute-api:/*",
            },
            {
              Action: "execute-api:Invoke",
              Effect: "Deny",
              Principal: {
                AWS: "*",
              },
              Resource: "execute-api:/*",
            },
          ],
          Version: "2012-10-17",
        },
      })
    );
  });
});
