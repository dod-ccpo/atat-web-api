import * as apigw from "@aws-cdk/aws-apigateway";
import { UserPool } from "@aws-cdk/aws-cognito";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";

export class AtatWebApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    const table = new dynamodb.Table(this, "AtatTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });
    const tableOutput = new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
    });

    const userPool = new UserPool(this, "PocUserPool");
    const userPoolClient = userPool.addClient("api-app-client", {
      authFlows: {
        userPassword: true,
      },
    });
    const userPoolDomain = userPool.addDomain("api-app-domain", {
      cognitoDomain: {
        domainPrefix: "atatapi",
      },
    });
    const poolDomainOutput = new cdk.CfnOutput(this, "UserPoolDomain", {
      value: userPoolDomain.domainName,
    });

    // Creates a shared API Gateway that all the functions will be able to add routes to.
    // Ideally we'd define different stages for dev, test, and staging. For now, a single
    // stage for everything being dev is good enough for a proof of concept
    const restApi = new apigw.RestApi(this, "AtatWebApi", {
      defaultCorsPreflightOptions: {
        allowCredentials: false,
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
    });
    restApi.root.addMethod("ANY");
    const restUrlOutput = new cdk.CfnOutput(this, "RootApiUri", {
      value: restApi.url ?? "",
    });

    const sharedFunctionProps: lambdaNodejs.NodejsFunctionProps = {
      environment: {
        ATAT_TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: ["aws-sdk"],
      },
    };

    // These Lambda functions back the API itself. Each function requires the creation of
    // the function resource, the LambdaProxyIntegration, and the addition of a route. This
    // is probably a really good example of something that could be moved to being a custom
    // construct that handles creating each of the three.
    const getPortfolioDraftsFn = new lambdaNodejs.NodejsFunction(this, "PortfolioDraftsGetFunction", {
      entry: "applications/portfolioDrafts/index.ts",
      ...sharedFunctionProps,
    });
    const postPortfolioDraftsFn = new lambdaNodejs.NodejsFunction(this, "PortfolioDraftsPostFunction", {
      entry: "applications/portfolioDrafts/index.ts",
      ...sharedFunctionProps,
    });

    const portfolioDrafts = restApi.root.addResource("portfolioDrafts");
    portfolioDrafts.addMethod("GET", new apigw.LambdaIntegration(getPortfolioDraftsFn));
    portfolioDrafts.addMethod("POST", new apigw.LambdaIntegration(postPortfolioDraftsFn));

    // Prevent the GET function from being able to write to DynamoDB (it doesn't need to)
    table.grantReadData(getPortfolioDraftsFn);
    // Allow the POST function to read and write (since that will be necessary to add the
    // new quotes)
    table.grantReadWriteData(postPortfolioDraftsFn);
  }
}
