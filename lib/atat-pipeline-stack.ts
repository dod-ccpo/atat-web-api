import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { AtatWebApiStack } from "./atat-web-api-stack";
import { AtatIamStack } from "./atat-iam-stack";
import { AtatNetStack } from "./atat-net-stack";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
}

export interface AtatPipelineStackProps extends cdk.StackProps, AtatProps {
  branch: string;
  repository: string;
  githubPatName: string;
}

export class AtatApplication extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
    super(scope, id, props);
    const iam = new AtatIamStack(this, `${props.environmentName}Iam`);
    const net = new AtatNetStack(this, `${props.environmentName}Net`, { vpcCidr: props.vpcCidr });
    const atat = new AtatWebApiStack(this, "Atat", {
      environmentName: props.environmentName,
      network: net,
    });
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
        commands: ["npm ci", "npm run build", `npm run -- cdk synth -c atat:EnvironmentId=${props.environmentName}`],
      }),
    });

    pipeline.addStage(new AtatApplication(this, props.environmentName, { environmentName: props.environmentName }));
  }
}
