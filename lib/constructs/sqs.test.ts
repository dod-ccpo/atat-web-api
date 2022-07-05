import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { FifoQueue } from "./sqs";

describe("IFP Cost Queues", () => {
  test("Ensure Cost Request and Response Queues are created", async () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const costRequestQueue = new FifoQueue(stack, "TestRequest");
    const costResponseQueue = new FifoQueue(stack, "TestResponse");

    const template = Template.fromStack(stack);
    template.hasResourceProperties(
      "AWS::SQS::Queue",
      Match.objectLike({ ContentBasedDeduplication: true, FifoQueue: true })
    );
    template.resourceCountIs("AWS::SQS::Queue", 2);
  });
});
