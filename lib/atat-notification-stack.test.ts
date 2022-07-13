import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AtatNotificationStack, IamChangeRule } from "./atat-notification-stack";

describe("IAM Change Notifications", () => {
  it("should match the schema created in the AWS Events console", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    // WHEN
    const eventRule = new IamChangeRule(stack, "IamRule");
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: {
        source: ["aws.iam"],
        "detail-type": ["AWS API Call via CloudTrail"],
        detail: {
          eventSource: ["iam.amazonaws.com"],
          eventName: [
            "CreateUser",
            "CreateLoginProfile",
            "CreateAccessKey",
            "UpdateUser",
            "UpdateLoginProfile",
            "UpdateAccessKey",
            "DeleteLoginProfile",
            "DeleteUser",
          ],
        },
      },
    });
  });
});

describe("Atat Notification Stack", () => {
  it("should contain an SNS topic", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new AtatNotificationStack(app, "TestStack", {
      notificationEmail: "foo@example.com",
    });

    // WHEN
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties("AWS::SNS::Topic", {});
  });
});
