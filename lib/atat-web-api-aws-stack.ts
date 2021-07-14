import * as apigw from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';

export class AtatWebApiAwsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const table = new dynamodb.Table(this, 'QuotesTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
    });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });

    const restApi = new apigw.HttpApi(this, 'QuotesApi', { createDefaultStage: true });
    new cdk.CfnOutput(this, 'RestUri', { value: restApi.url ?? "" });
    
    const getQuote = new lambdaNodejs.NodejsFunction(this, 'QuotesGetFunction', {
      entry: 'poc/random_quote/handlers/quote.get.ts'
    });
    const postQuote = new lambdaNodejs.NodejsFunction(this, "QuotesPostFunction", {
      entry: 'poc/random_quote/handlers/quote.post.ts'
    });

    const getQuoteIntegration = new LambdaProxyIntegration({ handler: getQuote });
    const postQuoteIntegration = new LambdaProxyIntegration({ handler: postQuote });
    
    restApi.addRoutes({
      path: '/',
      methods: [ apigw.HttpMethod.GET ],
      integration: getQuoteIntegration
    });
    restApi.addRoutes({
      path: '/',
      methods: [ apigw.HttpMethod.POST ],
      integration: postQuoteIntegration
    });
    table.grantReadData(getQuote);
    table.grantReadWriteData(postQuote);
  }
}
