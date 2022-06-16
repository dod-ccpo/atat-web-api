import { Construct } from "constructs";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { AtatQueue } from "./sqs";
import { HttpMethod } from "../http";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { IResource, Method } from "aws-cdk-lib/aws-apigateway";
import { ApiRouteProps, IApiRoute } from "./api-route";

export interface ICostApiImplementation extends IApiRoute {
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
  readonly startCostJobFn: lambda.IFunction;
  readonly consumeCostResponseFn: lambda.IFunction;
}

export class CostApiImplementation extends Construct implements ICostApiImplementation {
  readonly methods: Record<HttpMethod, Method>;
  readonly path: IResource;
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
  readonly startCostJobFn: lambdaNodeJs.NodejsFunction;
  readonly consumeCostResponseFn: lambdaNodeJs.NodejsFunction;
  readonly props: ApiRouteProps;

  constructor(scope: Construct, props: ApiRouteProps) {
    super(scope, "CostResources");
    this.props = props;

    // Cost Queues
    this.costRequestQueue = new AtatQueue(this, "CostRequest", { environmentName: props.environmentName });
    this.costResponseQueue = new AtatQueue(this, "CostResponse", { environmentName: props.environmentName });

    // Cost Functions
    this.startCostJobFn = this.constructNodejsFunction(scope, "StartCostRequestJob", "api/cost/start-cost-job.ts", {
      COST_REQUEST_QUEUE_URL: this.costRequestQueue.sqs.queueUrl,
    });
    this.consumeCostResponseFn = this.constructNodejsFunction(
      scope,
      "ConsumeCostResponse",
      "api/cost/consume-cost-response.ts",
      {
        COST_RESPONSE_QUEUE_URL: this.costResponseQueue.sqs.queueUrl,
      }
    );

    this.costRequestQueue.sqs.grantSendMessages(this.startCostJobFn);
    this.costResponseQueue.sqs.grantConsumeMessages(this.consumeCostResponseFn);

    this.path = props.apiParent.addResource("cost-jobs");
    this.methods = {} as Record<HttpMethod, Method>;
    this.methods.POST = this.path.addMethod(HttpMethod.POST, new apigw.LambdaIntegration(this.startCostJobFn));
    this.methods.GET = this.path.addMethod(HttpMethod.GET, new apigw.LambdaIntegration(this.consumeCostResponseFn));
  }

  private constructNodejsFunction(
    scope: Construct,
    id: string,
    entry: string,
    functionPropsOverride: object
  ): lambdaNodeJs.NodejsFunction {
    return new lambdaNodeJs.NodejsFunction(scope, id, {
      entry,
      runtime: lambda.Runtime.NODEJS_16_X,
      vpc: this.props.vpc,
      memorySize: 256,
      timeout: Duration.seconds(5),
      environment: {
        ...functionPropsOverride,
      },
    });
  }
}
