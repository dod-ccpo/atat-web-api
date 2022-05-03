import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/**
 * A generic client application for an identity provider.
 *
 * This should be implemented for different types of client applications (for example,
 * a Lambda Function or a Step Functions State Machine may have different requirements).
 */
export interface IIdentityProviderClientApplication {
  /**
   * The name of the client application
   */
  name: string;

  /**
   * Properly configure the client application with information about the IdP client.
   *
   * @param clientId The ID of the client
   * @param clientSecretId The name in AWS Secrets Manager of the secret that stores the Client Secret
   * @param idpDomain The domain at which the IdP is available for a client credentials grant flow
   */
  configure(clientId: string, clientSecretId: secrets.ISecret, idpDomain: string): void;
}

/**
 * A client application of the Identity Provider implemented as a Lambda Function.
 *
 * The Lambda Function will be configured with the IdP configuration values specified as
 * environment variables and the Function will be granted read access to the Client Secret.
 *
 * The Client ID will be stored in the `IDP_CLIENT_ID` environment variable.
 * The name of the Secrets Manager secret that stores the Client Secret will stored in the
 * `IDP_CLIENT_SECRET_NAME` environment variable.
 * The domain the IdP is accessible at will be stored in the `IDP_DOMAIN` environment variable.
 */
export class IdentityProviderLambdaClient implements IIdentityProviderClientApplication {
  public readonly name: string;
  private readonly fn: lambda.Function;

  constructor(name: string, fn: lambda.Function) {
    this.name = name;
    this.fn = fn;
  }

  configure(clientId: string, clientSecretId: secrets.ISecret, idpDomain: string): void {
    clientSecretId.grantRead(this.fn);
    this.fn.addEnvironment("IDP_CLIENT_ID", clientId);
    this.fn.addEnvironment("IDP_CLIENT_SECRET_NAME", clientSecretId.secretName);
    this.fn.addEnvironment("IDP_DOMAIN", idpDomain);
  }
}

/**
 * A generic OAuth 2.0 identity provider client.
 */
export interface IIdentityProviderClient {
  /**
   * The name of the client within the IdP's configuration.
   */
  readonly name?: string;
  /**
   * Client ID to use in an OAuth 2.0 client credentials grant flow.
   */
  readonly clientId: string;
  /**
   * The Client Secret to use in an OAuth 2.0 client credentials flow.
   */
  readonly secret: secrets.ISecret;
}

/**
 * Options for configuring an Identity Provider Client
 */
export interface IdentityProviderClientOptions {
  /**
   * The application that will function as the client.
   */
  clientApplication: IIdentityProviderClientApplication;
  scopes: string[];
}

/**
 * Properties for creating a client on the identity provider.
 */
export interface CognitoIdentityProviderClientProps extends IdentityProviderClientOptions {
  /**
   * The identity provider for which to create a client.
   */
  userPool: cognito.IUserPool;
}

/**
 * A Cognito User Pool Client-based IdP Client.
 *
 * This wraps the User Pool Client such that the necessary attributes are made
 * available in a generic way.
 */
export class CognitoIdentityProviderClient extends Construct {
  public readonly clientId: string;
  public readonly name: string;
  public readonly secret: secrets.ISecret;

  constructor(scope: Construct, id: string, props: CognitoIdentityProviderClientProps) {
    super(scope, id);
    const client = props.userPool.addClient("Client", {
      oAuth: {
        flows: {
          clientCredentials: true,
          authorizationCodeGrant: false,
          implicitCodeGrant: false,
        },
        scopes: props.scopes.map(cognito.OAuthScope.custom),
      },
      generateSecret: true,
    });
    const clientDetails = new UserPoolClientDetails(this, "ClientDetails", {
      client,
      userPool: props.userPool,
    });
    this.name = clientDetails.getResponseField("UserPoolClient.ClientName");
    this.clientId = client.userPoolClientId;
    this.secret = new secrets.Secret(this, "ClientSecret", {
      secretStringValue: cdk.SecretValue.resourceAttribute(
        clientDetails.getResponseField("UserPoolClient.ClientSecret")
      ),
    });
  }
}

export interface ScopeOption {
  name: string;
  description: string;
}

export interface ScopeConfiguration {
  resourceServerName?: string;
  scopes: ScopeOption[];
}

export interface IdentityProviderProps {
  scopes?: ScopeConfiguration[];
}

/**
 * A generic Identity Provider application.
 */
export interface IIdentityProvider {
  readonly domainName: string;
  addClient(app: IIdentityProviderClientApplication, scopes: string[]): IIdentityProviderClient;
}

/**
 * Required properties for creating an Identity Provider.
 */
export interface CognitoIdentityProviderProps extends IdentityProviderProps {
  domainPrefix?: string;
}

/**
 * An internal identity provider for the application.
 */
export class CognitoIdentityProvider extends Construct implements IIdentityProvider {
  public readonly domainName: string;

  public readonly userPool: cognito.IUserPool;
  public readonly domain: cognito.IUserPoolDomain;

  private readonly resourceServers: cognito.UserPoolResourceServer[] = [];
  constructor(scope: Construct, id: string, props?: CognitoIdentityProviderProps) {
    super(scope, id);
    this.userPool = new cognito.UserPool(this, "IdP", {});
    this.domain = this.userPool.addDomain("Domain", {
      cognitoDomain: {
        domainPrefix: props?.domainPrefix ?? id.toLowerCase(),
      },
    });
    this.domainName = this.domain.domainName;
    if (props?.scopes) {
      for (const scopeConfig of props.scopes) {
        if (!scopeConfig.resourceServerName) throw new Error("Cognito requires a resource server");
        this.resourceServers.push(
          this.userPool.addResourceServer(scopeConfig.resourceServerName, {
            identifier: scopeConfig.resourceServerName,
            scopes: scopeConfig.scopes.map(
              (scope) => new cognito.ResourceServerScope({ scopeName: scope.name, scopeDescription: scope.description })
            ),
          })
        );
      }
    }
  }

  public addClient(app: IIdentityProviderClientApplication, scopes: string[]): IIdentityProviderClient {
    const client = new CognitoIdentityProviderClient(this, `${app.name}Client`, {
      userPool: this.userPool,
      clientApplication: app,
      scopes,
    });
    // The UserPoolDomain object provides a `baseUrl()` function; however, the URL it creates
    // does not work in us-gov-west-1. Instead, we build the URL manually. We can assume that
    // `domainName` is not a full domain as they are not supported in `us-gov-west-1`.
    // See: aws/aws-cdk#20182
    const fullDomain = `${this.domain.domainName}.auth-fips.${cdk.Aws.REGION}.amazoncognito.com`;
    app.configure(client.clientId, client.secret, fullDomain);
    return client;
  }
}

interface UserPoolClientDetailsProps {
  client: cognito.IUserPoolClient;
  userPool: cognito.IUserPool;
}

/**
 * A custom resource with additional details about an AWS::Cognito::UserPoolClient.
 *
 * This AWS::Cognito::UserPoolClient resource type exposes depressingly few attributes
 * about the Client itself (like, not even the ID). This custom resource performs
 * a cognito-idp:DescribeUserPoolClient API call to fetch all the attributes. This
 * may not be a totally ideal use of a custom resource but it means that we don't have
 * to do weird things and grant a ton of permissions in resources created later.
 */
class UserPoolClientDetails extends cr.AwsCustomResource {
  constructor(scope: Construct, id: string, props: UserPoolClientDetailsProps) {
    super(scope, id, {
      onCreate: {
        service: "CognitoIdentityServiceProvider",
        action: "describeUserPoolClient",
        parameters: {
          ClientId: props.client.userPoolClientId,
          UserPoolId: props.userPool.userPoolId,
        },
        physicalResourceId: cr.PhysicalResourceId.of(props.client.userPoolClientId),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        // According to the Service Authorization reference the only resource specifier
        // allowed for this API action is the User Pool itself.
        resources: [props.userPool.userPoolArn],
      }),
    });
  }
}
