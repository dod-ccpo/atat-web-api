import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cdkMonitoring from "cdk-monitoring-constructs";
import { Construct } from "constructs";

export interface AtatMonitoringStackProps extends cdk.StackProps {
  monitoredScopes?: Construct[];
  notifiedEmail?: string;
  environmentName?: string;
}

export class AtatMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatMonitoringStackProps) {
    super(scope, id, props);
    const topic = new sns.Topic(this, "MonitoringTopic", {});
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
          enabled: false,
        },
        secretsManager: {
          // We need to do more work before we're ready to support automatically rotating
          // our secrets.
          enabled: false,
        },
      })
    );
  }
}
