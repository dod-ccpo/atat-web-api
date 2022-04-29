import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AtatRestApi } from "./apigateway";
import { ApiUser } from "./api-user";

describe("ATAT Api User construct creation", () => {
  test("IAM AccessKey is created for Api User", () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApiUser = new ApiUser(stack, "TestApiUser", { secretPrefix: "api/user/snow", username: "TestApiUser" });
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::AccessKey", {
      UserName: stack.resolve(testApiUser.user.userName),
    });
  });
  test("Secret is created for Api User", () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApiUser = new ApiUser(stack, "TestApiUser", { secretPrefix: "api/user/snow", username: "TestApiUser" });
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: stack.resolve(testApiUser.accessKey.secretName),
    });
  });
  test("Ensure grantOnRoute method properly attaches Api User to policy document", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testApigw = new AtatRestApi(stack, "SampleApi");
    testApigw.restApi.root.addMethod("ANY");
    const routeName = "/";
    const testApiUser = new ApiUser(stack, "TestApiUser", { secretPrefix: "api/user/snow", username: "TestApiUser" });
    testApigw.grantOnRoute(testApiUser.user, "*", routeName);

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
      Users: [stack.resolve(testApiUser.user.userName)],
    });
  });
});
