import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as cdk from "@aws-cdk/core";
import { v4 as uuidv4 } from "uuid";
import { CognitoAuthentication } from "./constructs/authentication";
import { HttpMethod } from "./http";

export interface AtatAuthStackProps extends cdk.StackProps {
  secretName: string;
  providerName: string;
  ticketId?: string;
  adminsGroupName?: string;
  usersGroupName?: string;
  removalPolicy?: cdk.RemovalPolicy;
}

export class AtatAuthStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AtatAuthStackProps) {
    super(scope, id, props);
    const ticketId: string = props.ticketId ?? uuidv4();
    const secret = secretsmanager.Secret.fromSecretNameV2(this, "OidcSecret", props.secretName);
    const cognitoAuthenthication = new CognitoAuthentication(this, "Authentication", {
      groupsAttributeName: "groups",
      adminsGroupName: props.adminsGroupName ?? "atat-admins",
      usersGroupName: props.adminsGroupName ?? "atat-users",
      cognitoDomain: "atat-api-" + ticketId.toLowerCase(),
      userPoolProps: {
        removalPolicy: props?.removalPolicy,
      },
      oidcIdps: [
        {
          providerName: props.providerName,
          clientId: secret.secretValueFromJson("clientId"),
          clientSecret: secret.secretValueFromJson("clientSecret"),
          oidcIssuerUrl: secret.secretValueFromJson("oidcIssuerUrl"),
          attributesRequestMethod: HttpMethod.GET,
        },
      ],
    });
  }
}
