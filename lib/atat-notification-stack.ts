import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as eventTargets from "aws-cdk-lib/aws-events-targets";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface AtatNotificationStackProps {
  /**
   * The system ISSO/ISSM-approved email address to which relevant notifications
   * must be sent.
   */
  notificationEmail: string;
  topicEncryptionKey: kms.IKey;
}

export class SsoUserChangeRule extends events.Rule {
  constructor(scope: Construct, id: string, props?: events.RuleProps) {
    super(scope, id, {
      ...props,
      eventPattern: {
        source: ["aws.sso-directory"],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          eventSource: ["sso-directory.amazonaws.com"],
          eventName: [
            // AC-2(4).5, AC-2(4).11 - Account Creation/Enabling actions
            "CreateUser",
            "EnableUser",
            // AC-2(4).6 - Account Modification Actions
            "UpdateUser",
            "UpdatePassword",
            "UpdateUserName",
            "UpdateMfaDeviceForUser",
            "DeleteMfaForUser",
            // AC-2(4).7, AC-2(4).8 - Account Disabling/Delete Actions
            "DeleteUser",
            "DisableUser",
          ],
        },
      },
    });
  }
}

export class IamChangeRule extends events.Rule {
  constructor(scope: Construct, id: string, props?: events.RuleProps) {
    super(scope, id, {
      ...props,
      eventPattern: {
        source: ["aws.iam"],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          eventSource: ["iam.amazonaws.com"],
          eventName: [
            // AC-2(4).5,AC-2(4).11 - Account Creation/Enabling Actions
            "CreateUser",
            "CreateLoginProfile",
            "CreateAccessKey",
            // AC-2(4).6 - Account Modification Actions
            "UpdateUser",
            "UpdateLoginProfile",
            // AC-2(4).7 - Account Disabling Actions
            "UpdateAccessKey",
            "AttachUserPolicy",
            "DetachUserPolicy",
            "DeleteLoginProfile",
            // AC-2(4).8
            "DeleteUser",
          ],
        },
      },
    });
  }
}

export class AtatNotificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatNotificationStackProps) {
    super(scope, id);
    const topic = new sns.Topic(this, "AtatNotifications", { masterKey: props.topicEncryptionKey });
    topic.addSubscription(new subscriptions.EmailSubscription(props.notificationEmail));
    const topicTarget = new eventTargets.SnsTopic(topic);

    const iamChanges = new IamChangeRule(this, "IamChanges");
    iamChanges.addTarget(topicTarget);
    const ssoChanges = new SsoUserChangeRule(this, "SsoChanges");
    ssoChanges.addTarget(topicTarget);
  }
}
