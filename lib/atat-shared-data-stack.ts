import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export class AtatSharedDataStack extends cdk.Stack {
  public readonly encryptionKey: kms.IKey;
  public readonly encryptionKeyAlias: kms.IAlias;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, "AtatKey");
    this.encryptionKeyAlias = key.addAlias("atat-default");
    this.encryptionKey = key;
  }
}
