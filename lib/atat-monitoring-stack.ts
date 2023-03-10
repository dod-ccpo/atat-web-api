import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cdkMonitoring from "cdk-monitoring-constructs";
import { Construct } from "constructs";

export interface AtatMonitoringStackProps extends cdk.StackProps {
  topicEncryptionKey: kms.IKey;
  monitoredScopes?: Construct[];
  notifiedEmail?: string;
  environmentName?: string;
}

export class AtatMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatMonitoringStackProps) {
    super(scope, id, props);
    const topic = new sns.Topic(this, "MonitoringTopic", {
      masterKey: props.topicEncryptionKey,
    });
    if (props?.notifiedEmail) {
      topic.addSubscription(new subscriptions.EmailSubscription(props.notifiedEmail));
    }
    const monitoring = new cdkMonitoring.MonitoringFacade(this, "Monitoring", {
      alarmFactoryDefaults: {
        actionsEnabled: true,
        action: new cdkMonitoring.SnsAlarmActionStrategy({ onAlarmTopic: topic }),
        alarmNamePrefix: `Atat${props?.environmentName ?? ""}`,
      },
    });
    props?.monitoredScopes?.forEach((scope) =>
      monitoring.monitorScope(scope, {
        billing: {
          // Allowing billing can certainly only result in odd behavior in GovCloud
          //Disbaled Billing
          enabled: false,
        },
        secretsManager: {
          // We need to do more work before we're ready to support automatically rotating
          // our secrets.
          enabled: false,
        },
        ec2: {
          // We do not use any of the support EC2 resources in our stacks, and this results
          // in odd synthesis warnings.
          enabled: false,
        },
      })
    );
  }
}
