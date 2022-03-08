import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { mapTasks, TasksMap } from "./sfn-lambda-invoke-task";

/**
 * Successful condition check used when status code is 200
 */
export const successResponse = sfn.Condition.numberEquals("$.cspResponse.Payload.statusCodeFn", 200);

/**
 * Client error condition check used when the status code is 400, 402, or 404
 */
export const clientErrorResponse = sfn.Condition.or(
  sfn.Condition.numberEquals("$.cspResponse.statusCode", 400),
  sfn.Condition.numberEquals("$.cspResponse.statusCode", 402),
  sfn.Condition.numberEquals("$.cspResponse.statusCode", 404)
);

/**
 * Internal error condition check used when the status code is 500
 */
export const internalErrorResponse = sfn.Condition.numberGreaterThanEquals("$.cspResponse.statusCode", 500);

/**
 * Retry condition check when the status code is 500, with a max retry of 6
 */
export const maxRetries = sfn.Condition.and(
  sfn.Condition.numberGreaterThan("$.cspResponsePass.retryCount", 6),
  sfn.Condition.numberGreaterThanEquals("$.cspResponse.statusCode", 500)
);

export interface ProvisioningWorkflowProps {
  environmentName: string;
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
export class ProvisioningWorkflow implements IProvisioningWorkflow {
  readonly mappedTasks: TasksMap = {};
  readonly workflow: sfn.IChainable;
  readonly logGroup: logs.ILogGroup;

  constructor(scope: Construct, props: ProvisioningWorkflowProps) {
    const { environmentName } = props;
    // Provisioning State machine functions
    const sampleFn = new lambdaNodeJs.NodejsFunction(scope, "SampleFunction", {
      entry: "api/provision/sample-fn.ts",
      // vpc: props.vpc,
    });

    // Tasks for the Provisioning State Machine
    const tasks = [
      {
        id: "InvokeCspApi",
        props: {
          lambdaFunction: sampleFn, // replace w/ mock CSP ATAT API lambda
          inputPath: "$",
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "Results",
        props: {
          lambdaFunction: sampleFn, // replace w/ result lambda (success/reject)
          inputPath: "$",
          resultPath: "$.resultResponse",
          outputPath: "$",
        },
      },
      {
        id: "Demo",
        props: {
          lambdaFunction: sampleFn,
          inputPath: "$",
          resultSelector: {
            statusCode: 200,
            retryCount: 7,
          },
          resultPath: "$.cspResponseDemo",
          outputPath: "$",
        },
      },
    ];
    this.mappedTasks = mapTasks(scope, tasks);
    const { InvokeCspApi, Results, Demo } = this.mappedTasks;

    // State machine choices based on the tasks output
    const httpResponseChoices = new sfn.Choice(scope, "HttpResponse")
      .when(successResponse, Results.sfnTask)
      .when(clientErrorResponse, Results.sfnTask)
      .when(maxRetries, Results.sfnTask)
      .when(internalErrorResponse, InvokeCspApi.sfnTask);

    // Composing state machine
    this.workflow = InvokeCspApi.sfnTask.next(Demo.sfnTask).next(httpResponseChoices);

    this.logGroup = new logs.LogGroup(scope, "StepFunctionsLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      logGroupName: `/aws/vendedlogs/states/StepFunctionsLogs${environmentName}`,
    });
  }
}
