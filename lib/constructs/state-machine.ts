import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface StateMachineProps {
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
      timeout: Duration.seconds(10),
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
