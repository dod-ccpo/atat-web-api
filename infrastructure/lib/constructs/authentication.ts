import {
  Duration,
  SecretValue,
  aws_cognito as cognito,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodeJs,
} from "aws-cdk-lib";

import { Construct } from "constructs";

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
  clientId: SecretValue | string;

  /**
   * The OIDC client secret for Cognito to communicate with the upstream IdP.
   */
  clientSecret: SecretValue;

  /**
   * The method that should be used to request attributes.
   *
   * Default: {@link HttpMethod.GET}
   */
  attributesRequestMethod?: HttpMethod;

  /**
   * The URL for the OIDC issuer.
   */
  oidcIssuerUrl: SecretValue | string;
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
    family_name: "family_name",
    given_name: "given_name",
    email: "email",
  };
}

/**
 * Configure Cognito for use with an upstream IdP and for a client application.
 */
export class CognitoAuthentication extends Construct {
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
   * The Post-Authentication Function used to generate authentication event logs.
   */
  public readonly postAuthenticationFunction: lambda.IFunction;

  /**
   * The User Pool Domain resource created with the custom or Cognito domain.
   */
  public readonly userPoolDomain: cognito.IUserPoolDomain;

  /**
   * All created User Pool Identity Provider resources, based on the configurations
   * provided.
   */
  public readonly idps: cognito.CfnUserPoolIdentityProvider[] = [];

  constructor(scope: Construct, id: string, props: CognitoAuthenticationProps) {
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
    this.postAuthenticationFunction = new lambdaNodeJs.NodejsFunction(this, "PostAuthentication", {
      entry: packageRoot() + "/cognito/postAuthentication/index.ts",
    });

    this.userPool = new cognito.UserPool(this, "Pool", {
      ...(props?.userPoolProps ?? {}),
      signInAliases: {},
      lambdaTriggers: {
        preTokenGeneration: this.preTokenGenerationFunction,
        postAuthentication: this.postAuthenticationFunction,
      },
      // To be clear, users cannot register for our pool. But just in case one
      // were to be created by an administrator, this enforces that the password
      // policy and MFA for the pool is as secure as possible.
      // MFA cannot be enabled for existing user pools so we need to comment this
      // out for now because CloudFormation doesn't recognize it as a scenario where
      // the resource needs to be replaced.
      // mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.NONE,
      passwordPolicy: {
        // This is the highest possible value
        minLength: 98,
        // This is the lowest possible value
        tempPasswordValidity: Duration.days(1),
        // These require all possible types of characters.
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
    });
    const cfnPool = this.userPool.node.defaultChild as cognito.CfnUserPool;
    cfnPool.overrideLogicalId("AtatUserPool");
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
