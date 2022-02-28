import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface StateMachineProps {
  /**
   * Props to define a State Machine
   */
  readonly stateMachineProps: sfn.StateMachineProps;
  /**
   * Props to define the State Machine log group
   */
  readonly logGroup: logs.ILogGroup;
}

/**
 * Creates a State Machine in AWS Step Functions service
 * - uses a Standard State Machine Type (default)
 * - 180 seconds timeout (default)
 */
export class StateMachine extends Construct {
  readonly stateMachine: sfn.IStateMachine;
  constructor(scope: Construct, id: string, props: StateMachineProps) {
    super(scope, id);
    const stateMachine = new sfn.StateMachine(this, id, {
      // defaults that can be overridden
      timeout: Duration.minutes(3),
      stateMachineType: sfn.StateMachineType.STANDARD,
      // configuration passed in
      ...props.stateMachineProps,
      // defaults that cannot be overridden
      tracingEnabled: true,
      logs: {
        level: sfn.LogLevel.ALL,
        destination: props.logGroup,
      },
    });
    this.stateMachine = stateMachine;
  }
}

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
