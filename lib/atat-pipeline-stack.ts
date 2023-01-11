import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatMonitoringStack } from "./atat-monitoring-stack";
import { AtatNetStack } from "./atat-net-stack";
import { AtatNotificationStack } from "./atat-notification-stack";
import { ApiCertificateOptions, AtatWebApiStack } from "./atat-web-api-stack";
import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
import { AtatSharedDataStack } from "./atat-shared-data-stack";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  notificationEmail?: string;
  apiDomain?: ApiCertificateOptions;
  vpcFlowLogBucket?: AtatNetStack;
}

export interface AtatPipelineStackProps extends cdk.StackProps, AtatProps {
  branch: string;
  repository: string;
  githubPatName: string;
}

class AtatApplication extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
    super(scope, id, props);
    const net = new AtatNetStack(this, "AtatNetworking", { vpcCidr: props.vpcCidr });
    const atat = new AtatWebApiStack(this, "AtatHothApi", {
      environmentName: props.environmentName,
      apiDomain: props.apiDomain,
      network: net,
    });
    const sharedData = new AtatSharedDataStack(this, "AtatSharedData");
    const monitoredStacks: cdk.Stack[] = [net, atat];
    if (props.notificationEmail) {
      monitoredStacks.push(
        new AtatNotificationStack(this, "AtatNotifications", {
          notificationEmail: props.notificationEmail,
          topicEncryptionKey: sharedData.encryptionKey,
        })
      );
    }
    const monitoring = new AtatMonitoringStack(this, "AtatMonitoring", {
      monitoredScopes: monitoredStacks,
      notifiedEmail: props.notificationEmail,
      environmentName: props.environmentName,
      topicEncryptionKey: sharedData.encryptionKey,
    });
    cdk.Aspects.of(this).add(new GovCloudCompatibilityAspect());
    cdk.Aspects.of(atat).add(new NIST80053R4Checks({ verbose: true }));
    NagSuppressions.addStackSuppressions(atat, [
      {
        id: "NIST.800.53.R4-IAMNoInlinePolicy",
        reason: "Inline policies are used in a large number of situations by CDK constructs.",
      },
    ]);
  }
}

export class AtatPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatPipelineStackProps) {
    super(scope, id, props);
    const synthParams = [
      AtatContextValue.ENVIRONMENT_ID.toCliArgument(props.environmentName),
      AtatContextValue.VPC_CIDR.toCliArgument(props.vpcCidr),
    ];
    if (props.apiDomain) {
      synthParams.push(
        AtatContextValue.API_DOMAIN_NAME.toCliArgument(props.apiDomain.domainName),
        AtatContextValue.API_CERTIFICATE_ARN.toCliArgument(props.apiDomain.acmCertificateArn)
      );
    }

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(props.repository, props.branch, {
          authentication: cdk.SecretValue.secretsManager(props.githubPatName, {
            versionId: AtatContextValue.FORCE_GITHUB_TOKEN_VERSION.resolve(this),
          }),
        }),
        commands: ["npm ci", "npm run build", "npm run -- cdk synth " + synthParams.join(" ")],
      }),
    });

    pipeline.addStage(
      new AtatApplication(this, props.environmentName, {
        vpcCidr: props.vpcCidr,
        environmentName: props.environmentName,
        notificationEmail: props.notificationEmail,
        apiDomain: props.apiDomain,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}
