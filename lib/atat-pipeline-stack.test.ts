import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AtatPipelineStack } from "./atat-pipeline-stack";

const TEST_BRANCH_NAME = "test";

describe("Validate creation of the pipeline stack", () => {
  const envName = "At0000";
  const app = new cdk.App();
  const stack = new AtatPipelineStack(app, "TestPipelineStack", {
    environmentName: envName,
    branch: TEST_BRANCH_NAME,
    notificationEmail: "test@example.com",
    vpcFlowLogBucket: "arn:aws:us-east-1:s3::123456789012:flow-logs-123456789012-us-east-1",
  });
  const template = Template.fromStack(stack);

  it("should contain at least one CodeBuild project", async () => {
    template.hasResourceProperties("AWS::CodeBuild::Project", {});
  });

  it("should have exactly one CodePipeline project", async () => {
    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1);
  });

  it("should have CodeCommit repo with configured env name", async () => {
    template.hasResourceProperties("AWS::CodeCommit::Repository", {
      RepositoryName: `ATAT-CC-${envName}-Repo`,
    });
  });

  it("should have a user for code commit", async () => {
    template.resourceCountIs("AWS::IAM:User", 1);
  });
});
