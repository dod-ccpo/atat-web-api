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
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AtatIam.AtatIamStack(app, "TestIamStack", {});
    template = Template.fromStack(stack);
  });

  test("Fully assert generalReadAccess IAM managed policy with matchers", async () => {
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
  test("Fully assert auditorAccess IAM managed policy with matchers", async () => {
    template.hasResourceProperties(
      "AWS::IAM::ManagedPolicy",
      Match.objectEquals({
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
              Sid: "AllowArtifactReportPackageAccess",
            },
            {
              Action: "artifact:DownloadAgreement",
              Effect: "Allow",
              Resource: "*",
              Sid: "AllowArtifactAgreementDownload",
            },
          ],
          Version: "2012-10-17",
        },
        Description: "Grants additional security auditor access beyond SecurityAudit",
        Path: "/",
      })
    );
  });
  test("Fully assert developerRwAccess IAM managed policy with matchers", async () => {
    template.hasResourceProperties(
      "AWS::IAM::ManagedPolicy",
      Match.objectEquals({
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
              Sid: "AllowModifyingCdkToolBuckets",
            },
            {
              Action: [
                "dynamodb:RestoreTable*",
                "dynamodb:ExportTableToPointInTime",
                "dynamodb:ListBackups",
                "dynamodb:Describe*Backup*",
              ],
              Effect: "Allow",
              Resource: "*",
              Sid: "AllowDynamoDbBackupRestore",
            },
          ],
          Version: "2012-10-17",
        },
        Description: "Grants read/write access to developer-specific actions and resources",
        Path: "/",
      })
    );
  });
  test("Fully assert baseDenies IAM managed policy with matchers", async () => {
    template.hasResourceProperties(
      "AWS::IAM::ManagedPolicy",
      Match.objectEquals({
        PolicyDocument: {
          Statement: [
            {
              Action: "organizations:*",
              Effect: "Deny",
              Resource: "*",
              Sid: "DenyAllOrganizations",
            },
          ],
          Version: "2012-10-17",
        },
        Description: "",
        Path: "/",
      })
    );
  });
});
