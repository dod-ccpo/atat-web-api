import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as AtatIam from "./atat-iam-stack";

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
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AtatIam.AtatIamStack(app, "TestIamStack", {});
    template = Template.fromStack(stack);
  });

  test("Fully assert auditorAccess IAM managed policy with matchers", async () => {
    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "artifact:Get",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":artifact:::report-package/*",
                ],
              ],
            },
          },
          {
            Action: "artifact:DownloadAgreement",
            Effect: "Allow",
            Resource: "*",
          },
        ],
        Version: "2012-10-17",
      },
    });
  });
  test("Ensure developers can access CDK-related resources", async () => {
    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      // We only assert the existence of certain CDK-related permissions, which have broken
      // in the past. Other permissions _may_ exist on this policy as required.
      PolicyDocument: {
        Statement: [
          {
            Action: "s3:*",
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":s3:::cdk-*-assets-",
                    {
                      Ref: "AWS::AccountId",
                    },
                    "-*",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":s3:::cdktoolkit-stagingbucket-*",
                  ],
                ],
              },
            ],
          },
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Resource: {
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
                  ":role/cdk-hnb659fds-*-role-",
                  {
                    Ref: "AWS::AccountId",
                  },
                  "-",
                  {
                    Ref: "AWS::Region",
                  },
                ],
              ],
            },
          },
          {
            Action: "ssm:GetParameter",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":parameter/cdk-bootstrap/hnb659fds/*",
                ],
              ],
            },
          },
          Match.anyValue(),
        ],
        Version: "2012-10-17",
      },
      Description: Match.anyValue(),
      Path: "/",
    });
  });
  test("Fully assert baseDenies IAM managed policy with matchers", async () => {
    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "organizations:*",
            Effect: "Deny",
            Resource: "*",
          },
        ],
        Version: "2012-10-17",
      },
    });
  });
});
