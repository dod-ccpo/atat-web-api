import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { AtatWebApiStack } from "./atat-web-api-stack";
import { AtatIamStack } from "./atat-iam-stack";
import { AtatNetStack } from "./atat-net-stack";
import { AtatNotificationStack } from "./atat-notification-stack";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  notificationEmail?: string;
}

export interface AtatPipelineStackProps extends cdk.StackProps, AtatProps {
  branch: string;
  repository: string;
  githubPatName: string;
}

class AtatApplication extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
    super(scope, id, props);
    const iam = new AtatIamStack(this, "AtatIam");
    const net = new AtatNetStack(this, "AtatNetworking", { vpcCidr: props.vpcCidr });
    const atat = new AtatWebApiStack(this, "AtatHothApi", {
      environmentName: props.environmentName,
      network: net,
    });
    if (props.notificationEmail) {
      const notifications = new AtatNotificationStack(this, "AtatNotifications", {
        notificationEmail: props.notificationEmail,
      });
    }
    cdk.Aspects.of(this).add(new GovCloudCompatibilityAspect());
  }
}

export class AtatPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatPipelineStackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(props.repository, props.branch, {
          authentication: cdk.SecretValue.secretsManager(props.githubPatName),
        }),
        commands: [
          "npm ci",
          "npm run build",
          `npm run -- cdk synth -c atat:EnvironmentId=${props.environmentName} -c atat:VpcCidr=${props.vpcCidr}`,
        ],
      }),
    });

    pipeline.addStage(
      new AtatApplication(this, props.environmentName, {
        vpcCidr: props.vpcCidr,
        environmentName: props.environmentName,
        notificationEmail: props.notificationEmail,
      })
    );
  }
}
