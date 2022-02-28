import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as AtatIam from "../lib/atat-iam-stack";

describe("ATAT network creation", () => {
  test("Ensure expected outputs are present", async () => {
    // GIVEN
    const app = new cdk.App();
    const expectedOutputNames = [
      "AtatQaTestRoleArn",
      "AtatDeveloperRoleArn",
      "AtatAuditorRoleArn",
      "AtatCloudFormationExecutionRoleArn",
      "AtatDeploymentRoleArn",
      "AtatGitHubOidcProvider",
    ];
    // WHEN
    const stack = new AtatIam.AtatIamStack(app, "TestIamStack", {});
    const template = Template.fromStack(stack);
    // THEN
    for (const output of expectedOutputNames) {
      template.hasOutput("*", { Export: { Name: output } });
    }
  });
});

describe("ATAT IAM Policy creation", () => {
  test("Fully assert generalReadAccess IAM managed policy with matchers", async () => {
    // GIVEN
    const app = new cdk.App();

    // WHEN
    const stack = new AtatIam.AtatIamStack(app, "TestIamStack", {});
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties(
      "AWS::IAM::ManagedPolicy",
      Match.objectEquals({
        PolicyDocument: {
          Statement: [
            {
              Action: ["dynamodb:*GetItem", "dynamodb:PartiQLSelect", "dynamodb:Scan", "dynamodb:Query"],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":dynamodb:*:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":table/*",
                  ],
                ],
              },
              Sid: "DynamoDBItemAccess",
            },
            {
              Action: "apigateway:GET",
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":apigateway:*::/restapis*",
                  ],
                ],
              },
              Sid: "APIGatewayRestApiReadAccess",
            },
            {
              Action: ["states:List*", "states:Describe*", "states:GetExecutionHistory"],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":states:*:",
                    {
                      Ref: "AWS::AccountId",
                    },
                    ":stateMachine:*",
                  ],
                ],
              },
              Sid: "StepFunctionsReadAccess",
            },
            {
              Action: ["xray:BatchGetTraces", "xray:Get*", "xray:List*"],
              Effect: "Allow",
              Resource: "*",
              Sid: "XRayReadAccess",
            },
          ],
          Version: "2012-10-17",
        },
        Description: "Grants read access to specific resources not in ViewOnlyAccess",
        Path: "/",
      })
    );
  });
});
