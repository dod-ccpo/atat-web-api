import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export class AtatSharedDataStack extends cdk.Stack {
  public readonly encryptionKey: kms.IKey;
  public readonly encryptionKeyAlias: kms.IAlias;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, "AtatKey", {
      enableKeyRotation: true,
      description: "This key is used for SNS topic encryption",
    });
    this.encryptionKeyAlias = key.addAlias("atat-default");
    this.encryptionKey = key;

    const svsprincipal = new iam.ServicePrincipal("events.amazonaws.com");
    key.grantDecrypt(svsprincipal);
    key.grantAdmin(svsprincipal);

    // Cloudwatch Log group for C5ISR
    const logGroup = new logs.LogGroup(this, "cssp-cwl-logs", {
      //  logGroupName: `${environmentName.toLowerCase()}-cssp-cwl-logs`,
      retention: RetentionDays.INFINITE,
    });
    NagSuppressions.addResourceSuppressions(logGroup, [
      {
        id: "NIST.800.53.R4-CloudWatchLogGroupRetentionPeriod",
        reason: "Setting retention to infinte so no minimum retention is needed. ",
      },
    ]);
  }
}
