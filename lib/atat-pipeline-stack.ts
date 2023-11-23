import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
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
  vpcFlowLogBucket: string;
  tgweventbusARN?: string;
  albeventbusARN: string;
}

export interface AtatPipelineStackProps extends cdk.StackProps, AtatProps {
  branch: string;
}

class AtatApplication extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
    super(scope, id, props);
    const net = new AtatNetStack(this, "AtatNetworking", {
      vpcCidr: props.vpcCidr,
      vpcFlowLogBucket: props.vpcFlowLogBucket,
      tgwEventBus: props.tgweventbusARN,
    });
    const atat = new AtatWebApiStack(this, "AtatHothApi", {
      environmentName: props.environmentName,
      apiDomain: props.apiDomain,
      network: net,
      albeventbusARN: props.albeventbusARN,
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
      AtatContextValue.VPC_FLOW_LOG_BUCKET.toCliArgument(props.vpcFlowLogBucket),
      AtatContextValue.VERSION_CONTROL_BRANCH.toCliArgument(props.branch),
      AtatContextValue.NOTIFICATION_EMAIL.toCliArgument(props.notificationEmail),
      AtatContextValue.TGW_EVENT_BUS_ARN.toCliArgument(props.tgweventbusARN),
      AtatContextValue.ALB_EVENT_BUS_ARN.toCliArgument(props.albeventbusARN),
    ];
    if (props.apiDomain) {
      synthParams.push(
        AtatContextValue.API_DOMAIN_NAME.toCliArgument(props.apiDomain.domainName),
        AtatContextValue.API_CERTIFICATE_ARN.toCliArgument(props.apiDomain.acmCertificateArn)
      );
    }

    const repo = new codecommit.Repository(this, "ATAT-Repository", {
      repositoryName: "ATAT-CC-" + props.environmentName + "-Repo",
    });

    const user = new iam.User(this, "ATAT-CodeCommit-User", {});

    const policy = new iam.Policy(this, "ATAT-Gitlab-UserPolicy", {
      policyName: "ATAT-Gitlab-UserPolicy",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["codecommit:GitPull", "codecommit:GitPush"],
          resources: [repo.repositoryArn],
        }),
      ],
    });

    NagSuppressions.addResourceSuppressions(user, [
      {
        id: "NIST.800.53.R4-IAMUserGroupMembership",
        reason: "The IAM user does not belong to any group(s)",
      },
    ]);

    policy.attachToUser(user);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.codeCommit(repo, props.branch),
        commands: ["npm ci", "npm run build", "npm run -- cdk synth " + synthParams.join(" ")],
      }),
    });

    pipeline.addStage(
      new AtatApplication(this, props.environmentName, {
        vpcCidr: props.vpcCidr,
        environmentName: props.environmentName,
        notificationEmail: props.notificationEmail,
        apiDomain: props.apiDomain,
        vpcFlowLogBucket: props.vpcFlowLogBucket,
        tgweventbusARN: props.tgweventbusARN,
        albeventbusARN: props.albeventbusARN,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}
