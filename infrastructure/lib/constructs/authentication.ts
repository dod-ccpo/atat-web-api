import * as cognito from "@aws-cdk/aws-cognito";
import { CfnUserPool } from "@aws-cdk/aws-cognito";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "../http";
import { packageRoot } from "../util";

/**
 * The protocol that should be used when authenticating to the upstream
 * IdP.
 */
export enum AuthenticationProtocol {
  OIDC = "OIDC",
  SAML = "SAML",
}

/**
 * Properties for configuring an identity provider.
 */
export interface IdentityProviderProps {
  /**
   * The name of the provider.
   *
   * This will be used as the name of the provider in Cognito.
   */
  providerName: string;
}

/**
 * Properties for configuring an OIDC Identity Provider.
 */
export interface OIDCIdentityProviderProps extends IdentityProviderProps {
  /**
   * The OIDC client ID for Cognito to communicate with the upstream IdP.
   */
  clientId: cdk.SecretValue | string;

  /**
   * The OIDC client secret for Cognito to communicate with the upstream IdP.
   */
  clientSecret: cdk.SecretValue;

  /**
   * The method that should be used to request attributes.
   *
   * Default: {@link HttpMethod.GET}
   */
  attributesRequestMethod?: HttpMethod;

  /**
   * The URL for the OIDC issuer.
   */
  oidcIssuerUrl: cdk.SecretValue | string;
}

/**
 * Properties for configuring a SAML identity provider.
 */
export interface SAMLIdentityProviderProps extends IdentityProviderProps {
  /**
   * The URL where the SAML Metadata file can be fetched from.
   */
  metadataURL: string;
}

/**
 * Properties for configuring Cognito to use a third party IdP.
 */
export interface CognitoAuthenticationProps {
  /**
   * The name of SAML/OIDC attribute containing the groups.
   */
  groupsAttributeName?: string;

  /**
   * The identifier of the group for the administrators group. This must the
   * same value that will provided in the SAML Response or the OIDC Claim.
   */
  adminsGroupName: string;

  /**
   * The identifier of the group for the users group. This must the same value
   * value that will provided in the SAML Response or the OIDC Claim.
   */
  usersGroupName: string;

  /**
   * The prefix to use for the Cognito domain.
   */
  cognitoDomain: string;

  /**
   * The list of configurations for upstream SAML IdPs.
   */
  samlIdps?: SAMLIdentityProviderProps[];

  /**
   * The list of configurations for upstream OIDC IdPs.
   */
  oidcIdps?: OIDCIdentityProviderProps[];

  /**
   * Props for overriding the User Pool attributes.
   */
  userPoolProps?: cognito.UserPoolProps;
}

function samlAttributeMapping(props: CognitoAuthenticationProps): { [key: string]: string } {
  return {
    email: "email",
    family_name: "lastName",
    given_name: "firstName",
    [`custom:${props.groupsAttributeName}`]: "groups",
  };
}

function oidcAttributeMapping(props: CognitoAuthenticationProps): { [key: string]: string } {
  // TODO: Map more attributes as needed; these are based on the original proof of concept. We
  // probably want to try to capture the user's name and email address to do a basic attempt
  // at filling out their profile in the application.
  return {
    username: "sub",
    [`custom:${props.groupsAttributeName}`]: "groups",
  };
}

/**
 * Configure Cognito for use with an upstream IdP and for a client application.
 */
export class CognitoAuthentication extends cdk.Construct {
  /**
   * The created Cognito User Pool.
   */
  public readonly userPool: cognito.IUserPool;

  /**
   * The Cognito User Pool Group for administrators.
   */
  public readonly adminsGroup: cognito.CfnUserPoolGroup;

  /**
   * The Cognito User Pool Group for users.
   */
  public readonly usersGroup: cognito.CfnUserPoolGroup;

  /**
   * The Pre-Token Generation Function used for setting user attributes.
   */
  public readonly preTokenGenerationFunction: lambda.IFunction;

  /**
   * The User Pool Domain resource created with the custom or Cognito domain.
   */
  public readonly userPoolDomain: cognito.IUserPoolDomain;

  /**
   * All created User Pool Identity Provider resources, based on the configurations
   * provided.
   */
  public readonly idps: cognito.CfnUserPoolIdentityProvider[] = [];

  constructor(scope: cdk.Construct, id: string, props: CognitoAuthenticationProps) {
    super(scope, id);
    // The Pre-Token Generation Function is responsible for setting attributes on the User resource
    // prior to the token being generated. This is used here for setting the groups based on the
    // groups specified in the SAML Response or OIDC Claim.
    this.preTokenGenerationFunction = new lambdaNodeJs.NodejsFunction(this, "PreTokenGeneration", {
      entry: packageRoot() + "/cognito/preTokenGeneration/index.ts",
      environment: {
        GROUPS_ATTRIBUTE_CLAIM_NAME: `custom:${props.groupsAttributeName ?? "groups"}`,
      },
    });

    this.userPool = new cognito.UserPool(this, "Pool", {
      ...(props?.userPoolProps ?? {}),
      signInAliases: {},
      lambdaTriggers: { preTokenGeneration: this.preTokenGenerationFunction },
    });
    const cfnPool = this.userPool.node.defaultChild as CfnUserPool;
    cfnPool.schema = [
      {
        name: props.groupsAttributeName ?? "groups",
        attributeDataType: "String",
        mutable: true,
        required: false,
        stringAttributeConstraints: {
          maxLength: "2000",
        },
      },
    ];

    this.adminsGroup = new cognito.CfnUserPoolGroup(this, "AdminsGroup", {
      groupName: props.adminsGroupName,
      userPoolId: this.userPool.userPoolId,
    });
    this.usersGroup = new cognito.CfnUserPoolGroup(this, "UsersGroup", {
      groupName: props.usersGroupName,
      userPoolId: this.userPool.userPoolId,
    });

    // This allows us to have any number of supported backing IdPs leveraging
    // OIDC or SAML as the use case requires. The most common scenario is likely
    // to be a single OIDC IdP though.
    this.idps.push(...this.processSamlIdps(props.samlIdps ?? [], props));
    this.idps.push(...this.processOidcIdps(props.oidcIdps ?? [], props));

    this.userPoolDomain = new cognito.UserPoolDomain(this, "CognitoDomain", {
      cognitoDomain: {
        domainPrefix: props.cognitoDomain,
      },
      userPool: this.userPool,
    });
  }

  private processSamlIdps(
    idps: SAMLIdentityProviderProps[],
    props: CognitoAuthenticationProps
  ): cognito.CfnUserPoolIdentityProvider[] {
    return idps.map(
      (idp) =>
        new cognito.CfnUserPoolIdentityProvider(this, "SamlIdp" + idp.providerName, {
          providerName: idp.providerName,
          providerDetails: {
            MetadataURL: idp.metadataURL,
          },
          attributeMapping: { ...samlAttributeMapping(props) },
          providerType: AuthenticationProtocol.SAML,
          userPoolId: this.userPool.userPoolId,
        })
    );
  }

  private processOidcIdps(
    idps: OIDCIdentityProviderProps[],
    props: CognitoAuthenticationProps
  ): cognito.CfnUserPoolIdentityProvider[] {
    return idps.map(
      (idp) =>
        new cognito.CfnUserPoolIdentityProvider(this, "OidcIdp" + idp.providerName, {
          providerName: idp.providerName,
          providerDetails: {
            client_id: idp.clientId,
            client_secret: idp.clientSecret,
            attributes_request_method: idp.attributesRequestMethod ?? HttpMethod.GET,
            oidc_issuer: idp.oidcIssuerUrl,
            authorize_scopes: "email profile openid",
          },
          attributeMapping: { ...oidcAttributeMapping(props) },
          providerType: AuthenticationProtocol.OIDC,
          userPoolId: this.userPool.userPoolId,
        })
    );
  }
}
