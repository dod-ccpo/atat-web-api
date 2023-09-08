import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEvents from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { HttpMethod } from "../http";
import { ApiSfnFunction } from "./api-sfn-function";
import { IdentityProviderLambdaClient, IIdentityProvider } from "./identity-provider";
import { mapTasks, TasksMap } from "./sfn-lambda-invoke-task";
import { FifoQueue } from "./sqs";
import { LoggingStandardStateMachine } from "./state-machine";
import { AtatContextValue } from "../context-values";
import { ProvisionRequestType } from "../../api/client";

/**
 * Successful condition check
 */
export const successResponse = sfn.Condition.numberEquals("$.cspResponse.code", 200);

/**
 * A successful HTTP 202 response check
 */
export const asyncSuccessResponse = sfn.Condition.numberEquals("$.cspResponse.code", 202);

/**
 * Client error condition check
 */
export const clientErrorResponse = sfn.Condition.or(
  sfn.Condition.numberEquals("$.cspResponse.code", 400),
  sfn.Condition.numberEquals("$.cspResponse.code", 402),
  sfn.Condition.numberEquals("$.cspResponse.code", 403),
  sfn.Condition.numberEquals("$.cspResponse.code", 404)
);

export interface ProvisioningWorkflowProps {
  environmentName: string;
  idp?: IIdentityProvider;
  vpc?: ec2.IVpc;
  logEncryptionKey?: kms.IKey;
}

export interface IProvisioningWorkflow {
  mappedTasks: TasksMap;
  workflow: sfn.IChainable;
  logGroup: logs.ILogGroup;
}

/**
 * A provisioning state machine components (e.g., funcs, tasks, conditions)
 * composed to form a workflow for provisioning jobs from SNOW to the CSPs.
 *
 */
export class ProvisioningWorkflow extends Construct implements IProvisioningWorkflow {
  readonly mappedTasks: TasksMap = {};
  readonly workflow: sfn.IChainable;
  readonly logGroup: logs.ILogGroup;
  readonly provisioningJobsQueue: sqs.IQueue;
  readonly asyncProvisioningJobsQueue: sqs.IQueue;
  readonly resultFn: lambdaNodeJs.NodejsFunction;
  readonly provisioningQueueConsumer: ApiSfnFunction;
  readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: ProvisioningWorkflowProps) {
    super(scope, id);
    const { environmentName } = props;

    this.provisioningJobsQueue = new FifoQueue(scope, "ProvisioningJobsQueue");
    this.asyncProvisioningJobsQueue = new FifoQueue(scope, "AsyncProvisioningJobsQueue", {
      visibilityTimeout: cdk.Duration.hours(1),
    });

    // Provisioning State machine functions
    const cspConfig = secrets.Secret.fromSecretNameV2(
      this,
      "CspConfiguration",
      AtatContextValue.CSP_CONFIGURATION_NAME.resolve(this)
    );

    // Create Portfolio Fn
    const cspCreatePortfolioFn = new lambdaNodeJs.NodejsFunction(scope, "CspCreatePortfolioFn", {
      entry: "api/provision/csp-create-portfolio.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: { CSP_CONFIG_SECRET_NAME: cspConfig.secretArn },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    props.idp?.addClient(new IdentityProviderLambdaClient("CspCreatePortfolioClient", cspCreatePortfolioFn), [
      "atat/write-portfolio",
    ]);
    cspConfig.grantRead(cspCreatePortfolioFn);

    // Create Environment Fn
    const cspCreateEnvironmentFn = new lambdaNodeJs.NodejsFunction(scope, "CspCreateEnvironmentFn", {
      entry: "api/provision/csp-create-environment.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: { CSP_CONFIG_SECRET_NAME: cspConfig.secretArn },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    props.idp?.addClient(new IdentityProviderLambdaClient("CspCreateEnvironmentClient", cspCreateEnvironmentFn), [
      "atat/write-portfolio",
    ]);
    cspConfig.grantRead(cspCreateEnvironmentFn);

    // Update Task Order Fn
    const cspInvokeUpdateTaskOrderFn = new lambdaNodeJs.NodejsFunction(scope, "CspInvokeUpdateTaskOrderFn", {
      entry: "api/provision/csp-update-taskorder.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: { CSP_CONFIG_SECRET_NAME: cspConfig.secretArn },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    props.idp?.addClient(
      new IdentityProviderLambdaClient("cspInvokeUpdateTaskOrderClient", cspInvokeUpdateTaskOrderFn),
      ["atat/write-portfolio"]
    );
    cspConfig.grantRead(cspInvokeUpdateTaskOrderFn);

    this.resultFn = new lambdaNodeJs.NodejsFunction(scope, "ResultFunction", {
      entry: "api/provision/result-fn.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        PROVISIONING_QUEUE_URL: this.provisioningJobsQueue.queueUrl,
        ASYNC_PROVISIONING_JOBS_QUEUE_URL: this.asyncProvisioningJobsQueue.queueUrl,
      },
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    this.provisioningQueueConsumer = new ApiSfnFunction(this, "ConsumeProvisioningJobRequest", {
      method: HttpMethod.GET,
      handlerPath: "api/provision/consume-provisioning-job.ts",
      functionPropsOverride: {
        timeout: cdk.Duration.minutes(1),
        environment: {
          PROVISIONING_QUEUE_URL: this.provisioningJobsQueue.queueUrl,
        },
      },
      vpc: props.vpc,
    });
    this.provisioningJobsQueue.grantSendMessages(this.resultFn);
    this.provisioningJobsQueue.grantConsumeMessages(this.provisioningQueueConsumer.fn);
    this.asyncProvisioningJobsQueue.grantSendMessages(this.resultFn);

    // Tasks for the Provisioning State Machine
    const tasks = [
      {
        id: "InvokeCreatePortfolio",
        props: {
          lambdaFunction: cspCreatePortfolioFn,
          inputPath: "$.initialSnowRequest",
          resultSelector: {
            code: sfn.JsonPath.objectAt("$.Payload.code"),
            content: sfn.JsonPath.objectAt("$.Payload.content"),
          },
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "InvokeCreateEnvironment",
        props: {
          lambdaFunction: cspCreateEnvironmentFn,
          inputPath: "$.initialSnowRequest",
          resultSelector: {
            code: sfn.JsonPath.objectAt("$.Payload.code"),
            content: sfn.JsonPath.objectAt("$.Payload.content"),
          },
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "InvokeUpdateTaskOrder",
        props: {
          lambdaFunction: cspInvokeUpdateTaskOrderFn,
          inputPath: "$.initialSnowRequest",
          resultSelector: {
            code: sfn.JsonPath.objectAt("$.Payload.code"),
            content: sfn.JsonPath.objectAt("$.Payload.content"),
          },
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "EnqueueResults",
        props: {
          lambdaFunction: this.resultFn,
          payload: sfn.TaskInput.fromObject({
            code: sfn.JsonPath.objectAt("$.cspResponse.code"),
            content: sfn.JsonPath.objectAt("$.cspResponse.content"),
            initialSnowRequest: sfn.JsonPath.objectAt("$.initialSnowRequest"),
          }),
          resultPath: "$.enqueueResultResponse",
          outputPath: "$",
        },
      },
    ];
    this.mappedTasks = mapTasks(scope, tasks);
    const { InvokeCreatePortfolio, InvokeCreateEnvironment, InvokeUpdateTaskOrder, EnqueueResults } = this.mappedTasks;
    // update retry for the tasks
    InvokeCreatePortfolio.addRetry({ maxAttempts: 2, errors: ["MockCspApiError"] });
    InvokeCreatePortfolio.addCatch(EnqueueResults, { errors: ["States.ALL"], resultPath: "$.catchErrorResult" });
    InvokeCreateEnvironment.addRetry({ maxAttempts: 2, errors: ["MockCspApiError"] });
    InvokeCreateEnvironment.addCatch(EnqueueResults, { errors: ["States.ALL"], resultPath: "$.catchErrorResult" });
    InvokeUpdateTaskOrder.addRetry({ maxAttempts: 2, errors: ["MockCspApiError"] });
    InvokeUpdateTaskOrder.addCatch(EnqueueResults, { errors: ["States.ALL"], resultPath: "$.catchErrorResult" });

    const startState = new sfn.Choice(scope, "StartState")
      .when(
        sfn.Condition.stringEquals("$.initialSnowRequest.operationType", ProvisionRequestType.ADD_PORTFOLIO),
        InvokeCreatePortfolio
      )
      .when(
        sfn.Condition.stringEquals("$.initialSnowRequest.operationType", ProvisionRequestType.ADD_ENVIRONMENT),
        InvokeCreateEnvironment
      )
      .when(
        sfn.Condition.stringEquals("$.initialSnowRequest.operationType", ProvisionRequestType.UPDATE_TASK_ORDER),
        InvokeUpdateTaskOrder
      )
      .afterwards();

    // State machine choices based on the tasks output
    const httpResponseChoices = new sfn.Choice(scope, "HttpResponse")
      // Intentionally, the 202 response is omitted here; it's cleanup will happen
      .when(successResponse, EnqueueResults)
      .when(clientErrorResponse, EnqueueResults)
      .when(asyncSuccessResponse, EnqueueResults)
      .afterwards(); // converge choices and allows for additional tasks to be chained on

    // Composing state machine
    InvokeCreatePortfolio.next(httpResponseChoices);
    InvokeCreateEnvironment.next(httpResponseChoices);
    InvokeUpdateTaskOrder.next(httpResponseChoices);
    this.logGroup = new logs.LogGroup(scope, "StepFunctionsLogs", {
      retention: logs.RetentionDays.TEN_YEARS,
      logGroupName: `/aws/vendedlogs/states/StepFunctionsLogs${environmentName}`,
      encryptionKey: props.logEncryptionKey,
    });
    this.stateMachine = new LoggingStandardStateMachine(this, "ProvisioningStateMachine", {
      logGroup: this.logGroup,
      definition: startState,
    });

    // Set up the Async event handling
    const asyncProvisionWatcher = new lambdaNodeJs.NodejsFunction(this, "AsyncProvisionJob", {
      entry: "api/provision/async-provisioning-check.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        CSP_CONFIG_SECRET_NAME: cspConfig.secretArn,
        PROVISIONING_QUEUE_URL: this.provisioningJobsQueue.queueUrl,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    props.idp?.addClient(new IdentityProviderLambdaClient("CspAsyncProvisionJobClient", asyncProvisionWatcher), [
      "atat/read-portfolio",
    ]);
    cspConfig.grantRead(asyncProvisionWatcher);
    const asyncProvisionEventSource = new lambdaEvents.SqsEventSource(this.asyncProvisioningJobsQueue, {
      reportBatchItemFailures: true,
    });
    asyncProvisionWatcher.addEventSource(asyncProvisionEventSource);
    this.provisioningJobsQueue.grantSendMessages(asyncProvisionWatcher);
  }
}
