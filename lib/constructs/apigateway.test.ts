import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Template } from "aws-cdk-lib/assertions";
import { AtatRestApi, RestApiVpcConfiguration } from "./apigateway";

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
    //template.hasResourceProperties("AWS::CertificateManager::Certificate", {});
  });

  test("Ensure grantOnRoute method properly generates IAM policy with execute-api:Invoke action", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApigw = new AtatRestApi(stack, "SampleApi");
    testApigw.restApi.root.addMethod("ANY");
    const testUser = new iam.User(stack, "testUser");
    testApigw.grantOnRoute(testUser, "*", "/");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
          },
        ],
        Version: "2012-10-17",
      },
    });
  });

  test("Ensure grantOnRoute method properly attaches User to policy document", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApigw = new AtatRestApi(stack, "SampleApi");
    testApigw.restApi.root.addMethod("ANY");
    const testUser = iam.User.fromUserName(stack, "sampleApiUser", "testUser");
    const routeName = "/testEndpoint";
    testApigw.grantOnRoute(testUser, "*", routeName);
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":execute-api:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":",
                  stack.resolve((testApigw.restApi.node.defaultChild as cdk.CfnResource).ref),
                  "/",
                  stack.resolve((testApigw.restApi.deploymentStage.node.defaultChild as cdk.CfnResource).ref),
                  `/*${routeName}`,
                ],
              ],
            },
          },
        ],
        Version: "2012-10-17",
      },
      Users: [testUser.userName],
    });
  });

  test("Ensures AtatRestApi with vpcConfig in props properly sets EndpointConfiguration to PRIVATE", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const vpc = new ec2.Vpc(stack, "TestVpc", {});
    const interfaceEndpoint = new ec2.InterfaceVpcEndpoint(stack, "Test VPC Endpoint", {
      vpc,
      service: new ec2.InterfaceVpcEndpointService("test service", 443),
    });
    const vpcConfig = { vpc, interfaceEndpoint } as RestApiVpcConfiguration;
    const testApigw = new AtatRestApi(stack, "SampleApi", { vpcConfig });
    testApigw.restApi.root.addMethod("ANY");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      EndpointConfiguration: {
        Types: ["PRIVATE"],
      },
    });
  });
});
