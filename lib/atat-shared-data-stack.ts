import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export class AtatSharedDataStack extends cdk.Stack {
  public readonly encryptionKey: kms.IKey;
  public readonly encryptionKeyAlias: kms.IAlias;
  public readonly snsEncryptionKey: kms.IKey;
  public readonly snsEencryptionKeyAlias: kms.IAlias;

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
    key.grant(svsprincipal, "kms:GenerateDataKey*");

    // second key
    const snskey = new kms.Key(this, "snsAtatKey", {
      enableKeyRotation: true,
      description: "This key is used for SNS topic encryption",
    });
    this.encryptionKeyAlias = snskey.addAlias("atat-sns-default");
    this.encryptionKey = snskey;

    const svssnsprincipal = new iam.ServicePrincipal("events.amazonaws.com");
    key.grantDecrypt(svssnsprincipal);
    key.grant(svssnsprincipal, "kms:GenerateDataKey*");

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
