import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { ProvisioningWorkflow } from "./provisioning-sfn-workflow";
import { CfnRole } from "aws-cdk-lib/aws-iam";
import { CfnQueue } from "aws-cdk-lib/aws-sqs";

describe("Provisioning Workflow Tests", () => {
  let stack: cdk.Stack;
  let template: Template;
  let provisioningSfn: ProvisioningWorkflow;
  let queueSendMessagePolicyStatement: Record<string, string | string[]>;
  let queueConsumeMessagePolicyStatement: Record<string, string | string[]>;
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
    queueConsumeMessagePolicyStatement = {
      Action: [
        "sqs:ReceiveMessage",
        "sqs:ChangeMessageVisibility",
        "sqs:GetQueueUrl",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
      ],
      Effect: "Allow",
      Resource: stack.resolve((provisioningSfn.provisioningJobsQueue.node.defaultChild as CfnQueue).attrArn),
    };
    queueSendMessagePolicyStatement = {
      Action: ["sqs:SendMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"],
      Effect: "Allow",
      Resource: stack.resolve((provisioningSfn.provisioningJobsQueue.node.defaultChild as CfnQueue).attrArn),
    };
    // Note: add all functions which need to access the ProvisioningQueue here
    allowedRoles = Array.of(provisioningSfn.resultFn, provisioningSfn.provisioningQueueConsumer.fn).map((fn) =>
      stack.resolve((fn.role?.node.defaultChild as CfnRole).ref)
    );
  });

  test("Ensure SQS (FIFO) Queue is created", async () => {
    template.hasResourceProperties(
      "AWS::SQS::Queue",
      Match.objectLike({ ContentBasedDeduplication: true, FifoQueue: true })
    );
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

  test("Ensure Consumer Lambda is created & has queue URL", async () => {
    template.hasResourceProperties(
      "AWS::Lambda::Function",
      Match.objectLike({
        Environment: {
          Variables: {
            PROVISIONING_QUEUE_URL: Match.anyValue(),
          },
        },
        Role: stack.resolve((provisioningSfn.provisioningQueueConsumer.fn.role?.node.defaultChild as CfnRole).attrArn),
      })
    );
  });

  test("Ensure Provisioning Queue allows the Results Function to send messages", async () => {
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.objectLike({
        PolicyDocument: createPolicyDocument([queueSendMessagePolicyStatement]),
        Roles: Match.arrayWith(stack.resolve((provisioningSfn.resultFn.role?.node.defaultChild as CfnRole).attrArn)),
      })
    );
  });

  test("Ensure Provisioning Queue allows the Consumer Function to receive messages", async () => {
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.objectLike({
        PolicyDocument: createPolicyDocument([queueConsumeMessagePolicyStatement]),
        Roles: Match.arrayWith(
          stack.resolve((provisioningSfn.provisioningQueueConsumer.fn.role?.node.defaultChild as CfnRole).attrArn)
        ),
      })
    );
  });

  test("Ensure Provisioning Queue does not allow any other Roles to send/receive messages", async () => {
    template.hasResourceProperties(
      "AWS::IAM::Policy",
      Match.not(
        Match.objectLike({
          PolicyDocument: createPolicyDocument([queueConsumeMessagePolicyStatement, queueSendMessagePolicyStatement]),
          Roles: Match.not(Match.arrayWith(allowedRoles)),
        })
      )
    );
  });

  test("Ensure Provisioning State Machine is created and configured", async () => {
    template.hasResourceProperties(
      "AWS::StepFunctions::StateMachine",
      Match.objectLike({
        LoggingConfiguration: Match.anyValue(),
        StateMachineType: "STANDARD",
        TracingConfiguration: { Enabled: true },
      })
    );
  });
});

function createPolicyDocument(statements: Record<string, string | string[]>[]) {
  return {
    Statement: [...statements],
    Version: "2012-10-17",
  };
}
