import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as idp from "./identity-provider";

const sampleScopes = [
  {
    resourceServerName: "testserver1",
    scopes: [
      { name: "read-foo", description: "Allow reading foos" },
      { name: "write-foo", description: "Allow creating and updating foos" },
      { name: "write-bar", description: "Allow creating and updating bars" },
    ],
  },
  {
    resourceServerName: "testserver2",
    scopes: [{ name: "read-baz", description: "Allow reading bazes" }],
  },
];

describe("Cognito Identity Provider Creation", () => {
  test("that a User Pool is created", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testIdp = new idp.CognitoIdentityProvider(stack, "TestIdp");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Cognito::UserPool", {});
  });
  test("that a User Pool Domain is always created", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testIdp = new idp.CognitoIdentityProvider(stack, "TestIdp");
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      UserPoolId: stack.resolve((testIdp.userPool.node.defaultChild as cognito.CfnUserPool).ref),
    });
  });
  test("that scopes are added to the configuration", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const testIdp = new idp.CognitoIdentityProvider(stack, "TestIdp", {
      scopes: sampleScopes,
    });
    // THEN
    const template = Template.fromStack(stack);
    for (const sampleScope of sampleScopes) {
      template.hasResourceProperties("AWS::Cognito::UserPoolResourceServer", {
        Identifier: sampleScope.resourceServerName,
        Scopes: sampleScope.scopes.map((scope) => ({ ScopeName: scope.name, ScopeDescription: scope.description })),
      });
    }
  });
});

describe("Lambda OAuth client application creation", () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  const secret = new secrets.Secret(stack, "TestSecret");
  const fn = new lambda.Function(stack, "TestFn", {
    runtime: lambda.Runtime.NODEJS_14_X,
    code: lambda.Code.fromInline("foo"),
    handler: "foo",
  });
  // WHEN
  const clientApp = new idp.IdentityProviderLambdaClient("TestClient", fn);
  clientApp.configure("TESTCLIENT", secret, "TESTDOMAIN");
  // THEN
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: Match.objectLike({
        IDP_CLIENT_ID: "TESTCLIENT",
        IDP_CLIENT_SECRET_NAME: stack.resolve(secret.secretName),
        IDP_DOMAIN: "TESTDOMAIN",
      }),
    },
  });
});

class NullClientApplication implements idp.IIdentityProviderClientApplication {
  public name = "NULLCLIENT";
  public isConfigured = false;
  configure(): void {
    this.isConfigured = true;
  }
}

describe("Cognito client creation", () => {
  test("creating a client manually works successfully", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const clientApp = new NullClientApplication();
    const scopeConfig = sampleScopes[0];
    const expectedScopes = scopeConfig.scopes.map((scope) => `${scopeConfig.resourceServerName}/${scope.name}`);
    // WHEN
    const testIdp = new idp.CognitoIdentityProvider(stack, "TestIdp");
    const idpClient = new idp.CognitoIdentityProviderClient(stack, "TestClient", {
      userPool: testIdp.userPool,
      clientApplication: clientApp,
      scopes: expectedScopes,
    });
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AllowedOAuthFlows: ["client_credentials"],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: expectedScopes,
      GenerateSecret: true,
      UserPoolId: stack.resolve((testIdp.userPool.node.defaultChild as cognito.CfnUserPool).ref),
    });
  });
  test("adding a client adds and configures", async () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const clientApp = new NullClientApplication();
    const scopeConfig = sampleScopes[0];
    const expectedScopes = scopeConfig.scopes.map((scope) => `${scopeConfig.resourceServerName}/${scope.name}`);
    // WHEN
    const testIdp = new idp.CognitoIdentityProvider(stack, "TestIdp");
    const idpClient = testIdp.addClient(clientApp, expectedScopes);
    // THEN
    expect(clientApp.isConfigured).toBe(true);
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      AllowedOAuthFlows: ["client_credentials"],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: expectedScopes,
      GenerateSecret: true,
      UserPoolId: stack.resolve((testIdp.userPool.node.defaultChild as cognito.CfnUserPool).ref),
    });
  });
});
