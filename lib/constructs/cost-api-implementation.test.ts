import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { CfnRole } from "aws-cdk-lib/aws-iam";
import { CostApiImplementation } from "./cost-api-implementation";
import { AtatRestApi, AtatRestApiProps } from "./apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";

describe("Cost API Implementation Tests", () => {
  let stack: cdk.Stack;
  let template: Template;
  let costApiImplementation: CostApiImplementation;

  // Create the stack once and then run different tests against it
  beforeAll(() => {
    // GIVEN
    const app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "TestAtatVpc");
    const apiProps: AtatRestApiProps = {
      restApiName: `TestHothApi`,
      binaryMediaTypes: ["application/json", "application/pdf"],
    };
    const api = new AtatRestApi(stack, "HothApi", apiProps);
    // WHEN
    costApiImplementation = new CostApiImplementation(stack, { environmentName: "testEnv", api, vpc });
    template = Template.fromStack(stack);
  });

  test("Ensure SQS (FIFO) Queues are created", async () => {
    template.hasResourceProperties(
      "AWS::SQS::Queue",
      Match.objectLike({ ContentBasedDeduplication: true, FifoQueue: true })
    );
    expect(costApiImplementation.costRequestQueue).not.toEqual(undefined);
    expect(costApiImplementation.costResponseQueue).not.toEqual(undefined);
  });

  test("Ensure Result Lambda is created & has queue URL", async () => {
    template.hasResourceProperties(
      "AWS::Lambda::Function",
      Match.objectLike({
        Environment: {
          Variables: {
            COST_REQUEST_QUEUE_URL: Match.anyValue(),
          },
        },
        Role: stack.resolve((costApiImplementation.startCostJobFn.role?.node.defaultChild as CfnRole).attrArn),
      })
    );
  });

  test("Ensure Consumer Lambda is created & has queue URL", async () => {
    template.hasResourceProperties(
      "AWS::Lambda::Function",
      Match.objectLike({
        Environment: {
          Variables: {
            COST_RESPONSE_QUEUE_URL: Match.anyValue(),
          },
        },
        Role: stack.resolve((costApiImplementation.consumeCostResponseFn.role?.node.defaultChild as CfnRole).attrArn),
      })
    );
  });
});
