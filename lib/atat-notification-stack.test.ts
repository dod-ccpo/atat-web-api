import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import { Template } from "aws-cdk-lib/assertions";
import { AtatNotificationStack, IamChangeRule } from "./atat-notification-stack";

describe("IAM Change Notifications", () => {
  it("should match the schema created in the AWS Events console", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    // WHEN
    /* eslint-disable no-new */
    new IamChangeRule(stack, "IamRule");
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
            "AttachUserPolicy",
            "DetachUserPolicy",
            "DeleteLoginProfile",
            "DeleteUser",
          ],
        },
      },
    });
  });
});

describe("Atat Notification Stack", () => {
  it("should contain an SNS topic", () => {
    // GIVEN
    const app = new cdk.App();
    const keyStack = new cdk.Stack(app, "KeyStack");
    const key = new kms.Key(keyStack, "TestKey");

    // WHEN
    const stack = new AtatNotificationStack(app, "TestStack", {
      notificationEmail: "foo@example.com",
      topicEncryptionKey: key,
    });
    const template = Template.fromStack(stack);

    // THEN
    template.hasResourceProperties("AWS::SNS::Topic", {});
  });
});
