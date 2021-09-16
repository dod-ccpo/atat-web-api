import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from "@aws-cdk/core";
import { CognitoAuthentication } from "./constructs/authentication";
import { HttpMethod } from "./http";

export interface AtatAuthStackProps extends cdk.StackProps {
  secretName: string;
  providerName: string;
  environmentId: string;
  adminsGroupName?: string;
  usersGroupName?: string;
  removalPolicy?: cdk.RemovalPolicy;
}

export class AtatAuthStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AtatAuthStackProps) {
    super(scope, id, props);
    const secret = secretsmanager.Secret.fromSecretNameV2(this, "OidcSecret", props.secretName);
    const cognitoAuthentication = new CognitoAuthentication(this, "Authentication", {
      groupsAttributeName: "groups",
      adminsGroupName: props.adminsGroupName ?? "atat-admins",
      usersGroupName: props.adminsGroupName ?? "atat-users",
      cognitoDomain: "atat-api-" + props.environmentId,
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
    const poolIdParam = new ssm.StringParameter(this, "UserPoolIdParameter", {
      description: "Cognito User Pool ID",
      stringValue: cognitoAuthentication.userPool.userPoolId,
      parameterName: `/atat/${props.environmentId}/cognito/userpool/id`,
    });
    const idpNamesParam = new ssm.StringListParameter(this, "CognitoIdPNamesParameter", {
      description: "Names of configured identity providers",
      parameterName: `/atat/${props.environmentId}/cognito/idps`,
      stringListValue: cognitoAuthentication.idps.map((idp) => idp.providerName),
    });
  }
}
