import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AtatRestApi } from './constructs/apigateway';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AtatWebApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const apigw = new AtatRestApi(this, "SampleApi").restApi;
    apigw.root.addMethod('ANY');
  }
}
