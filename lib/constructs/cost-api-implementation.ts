import { Construct } from "constructs";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { AtatQueue } from "./sqs";
import { AtatRestApi } from "./apigateway";
import { HttpMethod } from "../http";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { IApiRoute } from "./api-route";
import { IResource, Method } from "aws-cdk-lib/aws-apigateway";

export interface CostResourcesProps {
  readonly environmentName: string;
  readonly vpc?: ec2.IVpc;
  readonly api: AtatRestApi;
}

export interface ICostApiImplementation extends IApiRoute {
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
  readonly startCostJobFn: lambdaNodeJs.NodejsFunction;
  readonly consumeCostResponseFn: lambdaNodeJs.NodejsFunction;
}

export class CostApiImplementation extends Construct implements ICostApiImplementation {
  // readonly methods: { [key in HttpMethod]: Method };
  readonly path: IResource;
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
  readonly startCostJobFn: lambdaNodeJs.NodejsFunction;
  readonly consumeCostResponseFn: lambdaNodeJs.NodejsFunction;

  constructor(scope: Construct, props: CostResourcesProps) {
    super(scope, "CostResources");

    // Cost Queues
    this.costRequestQueue = new AtatQueue(this, "CostRequest", { environmentName: props.environmentName });
    this.costResponseQueue = new AtatQueue(this, "CostResponse", { environmentName: props.environmentName });

    // Cost Functions
    this.startCostJobFn = constructNodejsFunction("StartCostRequestJob", "api/cost/start-cost-job.ts", {
      COST_REQUEST_QUEUE_URL: this.costRequestQueue.sqs.queueUrl,
    });
    this.consumeCostResponseFn = constructNodejsFunction("ConsumeCostResponse", "api/cost/consume-cost-response.ts", {
      COST_RESPONSE_QUEUE_URL: this.costResponseQueue.sqs.queueUrl,
    });

    this.costRequestQueue.sqs.grantSendMessages(this.startCostJobFn);
    this.costResponseQueue.sqs.grantConsumeMessages(this.consumeCostResponseFn);

    this.path = props.api.restApi.root.addResource("cost-jobs");
    this.path.addMethod(HttpMethod.POST, new apigw.LambdaIntegration(this.startCostJobFn));
    this.path.addMethod(HttpMethod.GET, new apigw.LambdaIntegration(this.consumeCostResponseFn));

    function constructNodejsFunction(
      id: string,
      entry: string,
      functionPropsOverride: object
    ): lambdaNodeJs.NodejsFunction {
      return new lambdaNodeJs.NodejsFunction(scope, id, {
        entry,
        runtime: lambda.Runtime.NODEJS_16_X,
        vpc: props.vpc,
        memorySize: 256,
        timeout: Duration.seconds(5),
        environment: {
          ...functionPropsOverride,
        },
      });
    }
  }
}
