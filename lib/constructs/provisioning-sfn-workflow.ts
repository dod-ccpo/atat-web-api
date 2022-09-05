import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
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

/**
 * Successful condition check
 */
export const successResponse = sfn.Condition.numberEquals("$.cspResponse.Payload.code", 200);

/**
 * Client error condition check
 */
export const clientErrorResponse = sfn.Condition.or(
  sfn.Condition.numberEquals("$.cspResponse.Payload.code", 400),
  sfn.Condition.numberEquals("$.cspResponse.Payload.code", 402),
  sfn.Condition.numberEquals("$.cspResponse.Payload.code", 404)
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
  readonly resultFn: lambdaNodeJs.NodejsFunction;
  readonly provisioningQueueConsumer: ApiSfnFunction;
  readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: ProvisioningWorkflowProps) {
    super(scope, id);
    const { environmentName } = props;

    this.provisioningJobsQueue = new FifoQueue(scope, "ProvisioningJobsQueue");

    // Provisioning State machine functions
    const cspConfig = secrets.Secret.fromSecretNameV2(
      this,
      "CspConfiguration",
      AtatContextValue.CSP_CONFIGURATION_NAME.resolve(this)
    );
    const cspWritePortfolioFn = new lambdaNodeJs.NodejsFunction(scope, "CspWritePortfolioFn", {
      entry: "api/provision/csp-write-portfolio.ts",
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: { CSP_CONFIG_SECRET_NAME: cspConfig.secretArn },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    props.idp?.addClient(new IdentityProviderLambdaClient("CspWritePortfolioClient", cspWritePortfolioFn), [
      "atat/write-portfolio",
    ]);
    cspConfig.grantRead(cspWritePortfolioFn);

    this.resultFn = new lambdaNodeJs.NodejsFunction(scope, "ResultFunction", {
      entry: "api/provision/result-fn.ts",
      runtime: lambda.Runtime.NODEJS_16_X,
      environment: {
        PROVISIONING_QUEUE_URL: this.provisioningJobsQueue.queueUrl,
      },
      vpc: props.vpc,
      tracing: lambda.Tracing.ACTIVE,
    });
    this.provisioningQueueConsumer = new ApiSfnFunction(this, "ConsumeProvisioningJobRequest", {
      method: HttpMethod.GET,
      handlerPath: "api/provision/consume-provisioning-job.ts",
      functionPropsOverride: {
        timeout: cdk.Duration.seconds(20),
        environment: {
          PROVISIONING_QUEUE_URL: this.provisioningJobsQueue.queueUrl,
        },
      },
      vpc: props.vpc,
    });
    this.provisioningJobsQueue.grantSendMessages(this.resultFn);
    this.provisioningJobsQueue.grantConsumeMessages(this.provisioningQueueConsumer.fn);

    // Tasks for the Provisioning State Machine
    const tasks = [
      {
        id: "InvokeCspApi",
        props: {
          lambdaFunction: cspWritePortfolioFn,
          inputPath: "$",
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "Results",
        props: {
          lambdaFunction: this.resultFn,
          inputPath: "$",
          resultPath: "$.resultResponse",
          outputPath: "$",
        },
      },
    ];
    this.mappedTasks = mapTasks(scope, tasks);
    const { InvokeCspApi, Results } = this.mappedTasks;
    // update retry for the tasks
    InvokeCspApi.addRetry({ maxAttempts: 2, errors: ["MockCspApiError"] });
    InvokeCspApi.addCatch(Results, { errors: ["States.ALL"], resultPath: "$.catchErrorResult" });

    // State machine choices based on the tasks output
    const httpResponseChoices = new sfn.Choice(scope, "HttpResponse")
      .when(successResponse, Results)
      .when(clientErrorResponse, Results)
      .afterwards(); // converge choices and allows for additional tasks to be chained on

    // Composing state machine
    this.workflow = InvokeCspApi.next(httpResponseChoices);
    this.logGroup = new logs.LogGroup(scope, "StepFunctionsLogs", {
      retention: logs.RetentionDays.TEN_YEARS,
      logGroupName: `/aws/vendedlogs/states/StepFunctionsLogs${environmentName}`,
      encryptionKey: props.logEncryptionKey,
    });
    this.stateMachine = new LoggingStandardStateMachine(this, "ProvisioningStateMachine", {
      logGroup: this.logGroup,
      definition: this.workflow,
    });
  }
}
