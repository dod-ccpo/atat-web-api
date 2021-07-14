import * as apigw from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";

export class AtatWebApiAwsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a shared DynamoDB table that will be used by all the functions in the project.
    const table = new dynamodb.Table(this, "QuotesTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });
    const tableOutput = new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
    });

    // Creates a shared API Gateway that all the functions will be able to add routes to.
    // Ideally we'd define different stages for dev, test, and staging. For now, a single
    // stage for everything being dev is good enough for a proof of concept
    const restApi = new apigw.HttpApi(this, "QuotesApi", {
      createDefaultStage: true,
    });
    const restUrlOutput = new cdk.CfnOutput(this, "RestUri", {
      value: restApi.url ?? "",
    });

    // These Lambda functions back the API itself. Each function requires the creation of
    // the function resource, the LambdaProxyIntegration, and the addition of a route. This
    // is probably a really good example of something that could be moved to being a custom
    // construct that handles creating each of the three.
    const getQuoteFn = new lambdaNodejs.NodejsFunction(this, "QuotesGetFunction", {
      entry: "poc/random_quote/handlers/quote.get.ts",
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });
    const postQuoteFn = new lambdaNodejs.NodejsFunction(this, "QuotesPostFunction", {
      entry: "poc/random_quote/handlers/quote.post.ts",
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    const getQuoteIntegration = new LambdaProxyIntegration({
      handler: getQuoteFn,
    });
    const postQuoteIntegration = new LambdaProxyIntegration({
      handler: postQuoteFn,
    });

    restApi.addRoutes({
      path: "/quote",
      methods: [apigw.HttpMethod.GET],
      integration: getQuoteIntegration,
    });
    restApi.addRoutes({
      path: "/quote",
      methods: [apigw.HttpMethod.POST],
      integration: postQuoteIntegration,
    });

    // Prevent the GET function from being able to write to DynamoDB (it doesn't need to)
    table.grantReadData(getQuoteFn);
    // Allow the POST function to read and write (since that will be necessary to add the
    // new quotes)
    table.grantReadWriteData(postQuoteFn);

    // An attempt to add a second route that further shows some of the copying and pasting
    // that might be helpful to have in dedicated construct.
    const getHelloFn = new lambdaNodejs.NodejsFunction(this, "HelloGetFunction", {
      entry: "poc/hello_name/handlers/hello.get.ts",
    });
    const getHelloIntegration = new LambdaProxyIntegration({
      handler: getHelloFn,
    });
    restApi.addRoutes({
      path: "/hello",
      methods: [apigw.HttpMethod.GET],
      integration: getHelloIntegration,
    });
  }
}
