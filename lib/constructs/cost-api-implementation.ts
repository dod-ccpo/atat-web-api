import { Construct } from "constructs";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { FifoQueue } from "./sqs";
import { HttpMethod } from "../http";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { IResource, Method } from "aws-cdk-lib/aws-apigateway";
import { ApiRouteProps, IApiRoute } from "./api-route";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as idp from "../constructs/identity-provider";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { AtatContextValue } from "../context-values";

export interface ICostApiImplementation extends IApiRoute {
  readonly costRequestQueue: FifoQueue;
  readonly costResponseQueue: FifoQueue;
  readonly startCostJobFn: lambda.IFunction;
  readonly consumeCostResponseFn: lambda.IFunction;
  readonly costRequestFn: lambda.IFunction;
}

export class CostApiImplementation extends Construct implements ICostApiImplementation {
  readonly methods: Record<HttpMethod, Method>;
  readonly path: IResource;
  public readonly costRequestQueue: FifoQueue;
  public readonly costResponseQueue: FifoQueue;
  readonly startCostJobFn: lambda.Function;
  readonly consumeCostResponseFn: lambda.Function;
  readonly costRequestFn: lambda.Function;
  readonly props: ApiRouteProps;

  constructor(scope: Construct, props: ApiRouteProps) {
    super(scope, "CostResources");
    this.props = props;

    // CSP config
    const cspConfig = secrets.Secret.fromSecretNameV2(
      this,
      "CspConfiguration",
      AtatContextValue.CSP_CONFIGURATION_NAME.resolve(this)
    );

    // Cost Queues
    this.costRequestQueue = new FifoQueue(this, "CostRequest");
    this.costResponseQueue = new FifoQueue(this, "CostResponse");

    // Cost Functions
    this.startCostJobFn = this.constructNodejsFunction(scope, "StartCostRequestJob", "api/cost/start-cost-job.ts", {
      environment: {
        COST_REQUEST_QUEUE_URL: this.costRequestQueue.queueUrl,
      },
    });
    this.costRequestFn = this.constructNodejsFunction(scope, "CostRequestFunction", "api/cost/cost-request-fn.ts", {
      memorySize: 512,
      timeout: Duration.seconds(30),
      environment: {
        COST_RESPONSE_QUEUE_URL: this.costResponseQueue.queueUrl,
        CSP_CONFIG_SECRET_NAME: cspConfig.secretArn,
      },
    });
    this.costRequestFn.addEventSource(new SqsEventSource(this.costRequestQueue, {}));
    this.consumeCostResponseFn = this.constructNodejsFunction(
      scope,
      "ConsumeCostResponse",
      "api/cost/consume-cost-response.ts",
      {
        environment: {
          COST_RESPONSE_QUEUE_URL: this.costResponseQueue.queueUrl,
        },
      }
    );

    // queue permissions
    this.costRequestQueue.grantSendMessages(this.startCostJobFn);
    this.costRequestQueue.grantConsumeMessages(this.costRequestFn);
    this.costResponseQueue.grantSendMessages(this.costRequestFn);
    this.costResponseQueue.grantConsumeMessages(this.consumeCostResponseFn);

    // secrets permissions
    cspConfig.grantRead(this.costRequestFn);
    props.idp?.addClient(new idp.IdentityProviderLambdaClient("CspReadCost", this.costRequestFn), ["atat/read-cost"]);

    this.path = props.apiParent.addResource("cost-jobs");
    this.methods = {} as Record<HttpMethod, Method>;
    this.methods.POST = this.path.addMethod(HttpMethod.POST, new apigw.LambdaIntegration(this.startCostJobFn));
    this.methods.GET = this.path.addMethod(HttpMethod.GET, new apigw.LambdaIntegration(this.consumeCostResponseFn));
  }

  private constructNodejsFunction(
    scope: Construct,
    id: string,
    entry: string,
    functionPropsOverride: NodejsFunctionProps
  ): lambdaNodeJs.NodejsFunction {
    return new lambdaNodeJs.NodejsFunction(scope, id, {
      entry,
      runtime: lambda.Runtime.NODEJS_18_X,
      vpc: this.props.vpc,
      memorySize: 256,
      timeout: Duration.seconds(5),
      ...functionPropsOverride,
      tracing: lambda.Tracing.ACTIVE,
    });
  }
}
