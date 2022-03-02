import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { mapTasks, TasksMap } from "./sfn-lambda-invoke-task";

/**
 * Successful condition check used when status code is 200
 */
export const successResponse = sfn.Condition.numberEquals("$.cspResponse.statusCode", 200);

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
  sfn.Condition.numberGreaterThan("$.cspResponse.retryCount", 6),
  sfn.Condition.numberGreaterThanEquals("$.cspResponse.statusCode", 500)
);

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

  constructor(scope: Construct) {
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
          lambdaFunction: sampleFn,
          inputPath: "$",
          resultSelector: {
            statusCode: sfn.JsonPath.stringAt("$.Payload.passRequest.response.statusCode"),
            body: sfn.JsonPath.stringAt("$.Payload.body"),
            retryCount: sfn.JsonPath.stringAt("$$.State.RetryCount"),
          },
          resultPath: "$.cspResponse",
          outputPath: "$",
        },
      },
      {
        id: "RejectPortfolioTask",
        props: {
          lambdaFunction: sampleFn,
          inputPath: "$.cspResponse",
        },
      },
    ];
    this.mappedTasks = mapTasks(scope, tasks);
    const { InvokeCspApi, RejectPortfolioTask } = this.mappedTasks;

    // State machine choices based on the tasks output
    const httpResponseChoices = new sfn.Choice(scope, "HttpResponse")
      .when(successResponse, InvokeCspApi.sfnTask)
      .when(clientErrorResponse, RejectPortfolioTask.sfnTask)
      .when(maxRetries, InvokeCspApi.sfnTask)
      .when(internalErrorResponse, RejectPortfolioTask.sfnTask);

    // Composing state machine
    this.workflow = InvokeCspApi.sfnTask.next(httpResponseChoices);
    this.logGroup = new logs.LogGroup(scope, "StepFunctionsLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      logGroupName: `/aws/vendedlogs/states/StepFunctionsLogs${"AT-7050"}`,
    });
  }
}
