import { Construct } from "constructs";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { AtatQueue } from "./sqs";
import { HttpMethod } from "../http";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { IResource, Method } from "aws-cdk-lib/aws-apigateway";
import { ApiRouteProps, IApiRoute } from "./api-route";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as idp from "../constructs/identity-provider";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";

export interface ICostApiImplementation extends IApiRoute {
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
  readonly startCostJobFn: lambda.IFunction;
  readonly consumeCostResponseFn: lambda.IFunction;
  readonly costRequestFn: lambda.IFunction;
}

export class CostApiImplementation extends Construct implements ICostApiImplementation {
  readonly methods: Record<HttpMethod, Method>;
  readonly path: IResource;
  readonly costRequestQueue: AtatQueue;
  readonly costResponseQueue: AtatQueue;
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
      this.node.tryGetContext("atat:CspConfigurationName")
    );

    // Cost Queues
    this.costRequestQueue = new AtatQueue(this, "CostRequest", { environmentName: props.environmentName });
    this.costResponseQueue = new AtatQueue(this, "CostResponse", { environmentName: props.environmentName });

    // Cost Functions
    this.startCostJobFn = this.constructNodejsFunction(scope, "StartCostRequestJob", "api/cost/start-cost-job.ts", {
      environment: {
        COST_REQUEST_QUEUE_URL: this.costRequestQueue.sqs.queueUrl,
      },
    });
    this.costRequestFn = this.constructNodejsFunction(scope, "CostRequestFunction", "api/cost/cost-request-fn.ts", {
      memorySize: 512,
      timeout: Duration.seconds(30),
      environment: {
        COST_RESPONSE_QUEUE_URL: this.costResponseQueue.sqs.queueUrl,
        CSP_CONFIG_SECRET_NAME: cspConfig.secretArn,
      },
    });
    this.costRequestFn.addEventSource(new SqsEventSource(this.costRequestQueue.sqs, {}));
    this.consumeCostResponseFn = this.constructNodejsFunction(
      scope,
      "ConsumeCostResponse",
      "api/cost/consume-cost-response.ts",
      {
        environment: {
          COST_RESPONSE_QUEUE_URL: this.costResponseQueue.sqs.queueUrl,
        },
      }
    );

    // queue permissions
    this.costRequestQueue.sqs.grantSendMessages(this.startCostJobFn);
    this.costRequestQueue.sqs.grantConsumeMessages(this.costRequestFn);
    this.costResponseQueue.sqs.grantSendMessages(this.costRequestFn);
    this.costResponseQueue.sqs.grantConsumeMessages(this.consumeCostResponseFn);

    // secrets permissions
    cspConfig.grantRead(this.costRequestFn);
    props.idp?.addClient(new idp.IdentityProviderLambdaClient("CspWriteCost", this.costRequestFn), [
      "atat/write-portfolio",
    ]);

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
      runtime: lambda.Runtime.NODEJS_16_X,
      vpc: this.props.vpc,
      memorySize: 256,
      timeout: Duration.seconds(5),
      ...functionPropsOverride,
    });
  }
}
