import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface ApiUserProps {
  /**
   * The path to use in Secrets Manager for the secrets. This will create a
   * secret of the form `${secretPrefix}/${username}` (so a `/` should not
   * be included).
   */
  secretPrefix: string;

  /**
   * A convenient name to distinguish this user in the name of the Secrets
   * Manager Secret. Notably, this is not used as the physical name of the
   * IAM user (which should be of minimal meaning since all access will be
   * via the API.)
   */
  username: string;
}

export class ApiUser extends Construct {
  public readonly user: iam.IUser;
  public readonly accessKey: secrets.ISecret;

  constructor(scope: Construct, id: string, props: ApiUserProps) {
    super(scope, id);

    const user = new iam.User(this, `ApiUser${props.username}`, { path: "/api/" });
    const accessKey = new iam.AccessKey(this, `ApiUser${props.username}Key`, {
      user,
    });
    const secret = new secrets.Secret(this, `ApiUser${props.username}KeySecret`, {
      secretName: `${props.secretPrefix}/${props.username}/${accessKey.accessKeyId}`,
      secretStringValue: accessKey.secretAccessKey,
    });

    this.user = user;
    this.accessKey = secret;
  }
}
