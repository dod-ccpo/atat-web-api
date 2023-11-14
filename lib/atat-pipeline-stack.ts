import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatNetStack } from "./atat-net-stack";
import { AtatNotificationStack } from "./atat-notification-stack";
import { ApiCertificateOptions, AtatWebApiStack } from "./atat-web-api-stack";
import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
import { AtatSharedDataStack } from "./atat-shared-data-stack";
import { SecretValue } from "aws-cdk-lib";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
  PhysicalResourceIdReference,
} from "aws-cdk-lib/custom-resources";
import * as cr from "aws-cdk-lib/custom-resources";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  notificationEmail?: string;
  apiDomain?: ApiCertificateOptions;
  vpcFlowLogBucket: string;
  eventbusARN?: string;
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
    });
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
      AtatContextValue.EVENT_BUS_ARN.toCliArgument(props.eventbusARN),
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

    const user = new iam.User(this, "ATAT-Gitlab-User", {
      userName: "ATAT-Gitlab-" + props.environmentName + "-User",
    });

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

    policy.attachToUser(user);

    const gitCredResource = new CodeCommitGitCredentials(this, "ATAT-GitCredentialsCustomResource", {
      iamUser: user,
      userName: "ATAT-Git-" + props.environmentName + "-Username",
    });
    const secret = new secrets.Secret(this, `ApiUser${props.username}KeySecret`, {
      secretName: `ATAT-CodeCommitUserCredentials-${props.environmentName}`,
      secretObjectValue: {
        username: cdk.SecretValue.unsafePlainText(gitCredResource.serviceUserName),
        password: cdk.SecretValue.unsafePlainText(gitCredResource.serviceUserName),
      },
    });

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
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}
export class CodeCommitGitCredentialsProps {
  userName: string;
  iamUser: iam.User;
}

export class CodeCommitGitCredentials extends Construct {
  readonly serviceSpecificCredentialId: string;
  readonly serviceName: string;
  readonly serviceUserName: string;
  readonly servicePassword: string;
  readonly status: string;

  constructor(scope: Construct, id: string, props: CodeCommitGitCredentialsProps) {
    super(scope, id);

    // Create the Git Credentials required
    const gitCredResp = new AwsCustomResource(this, "gitCredentials", {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html#createServiceSpecificCredential-property
      onCreate: {
        service: "IAM",
        action: "createServiceSpecificCredential",
        parameters: {
          ServiceName: "codecommit.amazonaws.com",
          UserName: props.userName,
        },
        physicalResourceId: PhysicalResourceId.fromResponse("ServiceSpecificCredential.ServiceSpecificCredentialId"),
      },
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html#deleteServiceSpecificCredential-property
      onDelete: {
        service: "IAM",
        action: "deleteServiceSpecificCredential",
        parameters: {
          ServiceSpecificCredentialId: new PhysicalResourceIdReference(),
          UserName: props.userName,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: [props.iamUser.userArn] }),
    });

    this.serviceSpecificCredentialId = gitCredResp.getResponseField(
      "ServiceSpecificCredential.ServiceSpecificCredentialId"
    );
    this.serviceName = gitCredResp.getResponseField("ServiceSpecificCredential.ServiceName");
    this.serviceUserName = gitCredResp.getResponseField("ServiceSpecificCredential.ServiceUserName");
    this.servicePassword = gitCredResp.getResponseField("ServiceSpecificCredential.ServicePassword");
    this.status = gitCredResp.getResponseField("ServiceSpecificCredential.Status");
  }
}
