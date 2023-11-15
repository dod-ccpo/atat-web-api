import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AtatPipelineStack } from "./atat-pipeline-stack";

const TEST_BRANCH_NAME = "test";

describe("Validate creation of the pipeline stack", () => {
  let app: cdk.App;
  let stack: AtatPipelineStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AtatPipelineStack(app, "TestPipelineStack", {
      environmentName: "At0000",
      branch: TEST_BRANCH_NAME,
      eventbusARN: "arn:aws:us-east-1:event:12345678910:test",
      notificationEmail: "test@example.com",
      vpcFlowLogBucket: "arn:aws:us-east-1:s3::12345678910:test-flow-logs-123456789012-us-east-1",
    });
    template = Template.fromStack(stack);
  });

  it("should contain at least one CodeBuild project", async () => {
    template.hasResourceProperties("AWS::CodeBuild::Project", {});
  });

  it("should have exactly one CodePipeline project", async () => {
    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1);
  });
});
