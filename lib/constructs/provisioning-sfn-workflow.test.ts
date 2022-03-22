import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { ProvisioningWorkflow } from "./provisioning-sfn-workflow";
import { CfnRole } from "aws-cdk-lib/aws-iam";
import { CfnQueue } from "aws-cdk-lib/aws-sqs";

describe("Provisioning Workflow Tests", () => {
  let stack: cdk.Stack;
  let template: Template;
  let provisioningSfn: ProvisioningWorkflow;
  let queuePolicyDocument: Record<string, unknown>;
  let allowedRoles: Array<CfnRole>;

  // Create the stack once and then run different tests against it
  beforeAll(() => {
    // GIVEN
    const app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
    // WHEN
    provisioningSfn = new ProvisioningWorkflow(stack, "TestWorkflow", { environmentName: "testEnv" });
    template = Template.fromStack(stack);

    // Define Fixtures
    queuePolicyDocument = {
      Statement: [
        {
          Action: ["sqs:SendMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"],
          Effect: "Allow",
          Resource: stack.resolve((provisioningSfn.provisioningJobsQueue.node.defaultChild as CfnQueue).attrArn),
        },
      ],
      Version: "2012-10-17",
    };
    // Note: add all functions which need to access the ProvisioningQueue here
    allowedRoles = Array.of(provisioningSfn.resultFn).map((fn) =>
      stack.resolve((fn.role?.node.defaultChild as CfnRole).ref)
    );
  });

  test("Ensure SQS Queue is created", async () => {
    template.hasResource("AWS::SQS::Queue", {});
    expect(provisioningSfn.provisioningJobsQueue).not.toEqual(undefined);
  });

  test("Ensure Result Lambda is created & has queue URL", async () => {
    template.hasResourceProperties(
      "AWS::Lambda::Function",
      Match.objectLike({
        Environment: {
          Variables: {
            PROVISIONING_QUEUE_URL: Match.anyValue(),
          },
        },
        Role: stack.resolve((provisioningSfn.resultFn.role?.node.defaultChild as CfnRole).attrArn),
      })
    );
  });

  test("Ensure Provisioning Queue allows the Results Function to send messages", async () => {
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.objectLike({
        PolicyDocument: queuePolicyDocument,
        Roles: Match.arrayWith(allowedRoles),
      })
    );
  });

  test("Ensure Provisioning Queue does not allow any other Roles to send messages", async () => {
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.not(
        Match.objectLike({
          PolicyDocument: queuePolicyDocument,
          Roles: Match.not(Match.arrayWith(allowedRoles)),
        })
      )
    );
  });
});