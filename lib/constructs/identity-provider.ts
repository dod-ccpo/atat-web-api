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
  readonly name: string;

  /**
   * Properly configure the client application with information about the IdP client.
   *
   * @param clientId The ID of the client
   * @param clientSecretId The name in AWS Secrets Manager of the secret that stores the Client Secret
   * @param idpBaseUrl The domain at which the IdP is available for a client credentials grant flow
   */
  configure(clientId: string, clientSecretId: secrets.ISecret, idpBaseUrl: string): void;
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
 * The base URL of the IdP will be stored in the `IDP_BASE_URL` environment variable.
 */
export class IdentityProviderLambdaClient implements IIdentityProviderClientApplication {
  public readonly name: string;
  private readonly fn: lambda.Function;

  constructor(name: string, fn: lambda.Function) {
    this.name = name;
    this.fn = fn;
  }

  configure(clientId: string, clientSecretId: secrets.ISecret, idpBaseUrl: string): void {
    clientSecretId.grantRead(this.fn);
    this.fn.addEnvironment("IDP_CLIENT_ID", clientId);
    this.fn.addEnvironment("IDP_CLIENT_SECRET_NAME", clientSecretId.secretName);
    this.fn.addEnvironment("IDP_BASE_URL", idpBaseUrl);
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
  readonly clientApplication: IIdentityProviderClientApplication;
  readonly scopes: string[];
}

/**
 * Properties for creating a client on the identity provider.
 */
export interface CognitoIdentityProviderClientProps extends IdentityProviderClientOptions {
  /**
   * The identity provider for which to create a client.
   */
  readonly userPool: cognito.IUserPool;
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

/**
 * Configuration information for a single scope
 */
export interface ScopeOptions {
  /**
   * The name that will be used to uniquely identify the scope
   */
  readonly name: string;
  /**
   * A human-readable description of the scope
   */
  readonly description: string;
}

/**
 * Configuration for scopes
 */
export interface ScopeConfiguration {
  /**
   * A name for the resource server the scopes belong to
   *
   * @default the scopes do not have a resource server
   */
  readonly resourceServerName?: string;
  /**
   * The actual scopes associated with the resource
   */
  readonly scopes: ScopeOptions[];
}

/**
 * Base configuration options for any identity provider
 */
export interface IdentityProviderProps {
  /**
   * Configuration for the scopes associated with this identity provider.
   *
   * @default No scopes will be configured
   */
  readonly scopeConfig?: ScopeConfiguration[];
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
  /**
   * The custom domain prefix to use for Cognito.
   *
   * @default try to automatically generate a name (that may change or may not be unique)
   */
  readonly domainPrefix?: string;
}

/**
 * An internal identity provider for the application.
 */
export class CognitoIdentityProvider extends Construct implements IIdentityProvider {
  public readonly domainName: string;

  public readonly userPool: cognito.IUserPool;
  public readonly domain: cognito.UserPoolDomain;

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
    if (props?.scopeConfig) {
      for (const scopeConfig of props.scopeConfig) {
        if (!scopeConfig.resourceServerName) {
          throw new Error("Cognito requires a resource server");
        }
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
    // Amazon Cognito requires the usage of the FIPS endpoints in us-gov-west-1
    app.configure(client.clientId, client.secret, this.domain.baseUrl({ fips: true }));
    return client;
  }
}

/**
 * Configuration options for creating a UserPoolClientDetails
 */
interface UserPoolClientDetailsProps {
  /**
   * The User Pool Client to describe
   */
  readonly client: cognito.IUserPoolClient;
  /**
   * The User Pool that the client is associated with.
   *
   * This is unfortunately required by the API called and not exposed as an
   * attribute of the UserPoolClient
   */
  readonly userPool: cognito.IUserPool;
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
