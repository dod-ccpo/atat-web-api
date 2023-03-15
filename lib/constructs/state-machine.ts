import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface StateMachineProps extends sfn.StateMachineProps {
  /**
   * The CloudWatch Log Group where logs from the State Machine will
   * be sent.
   */
  readonly logGroup: logs.ILogGroup;
}

/**
 * Creates a State Machine in AWS Step Functions service
 * - uses a Standard State Machine Type (default)
 * - 10 minutes timeout (default)
 */
export class LoggingStandardStateMachine extends sfn.StateMachine {
  constructor(scope: Construct, id: string, props: StateMachineProps) {
    const { logGroup, ...otherProps } = props;
    super(scope, id, {
      // defaults that can be overridden
      timeout: Duration.minutes(10),
      stateMachineType: sfn.StateMachineType.STANDARD,
      // configuration passed in
      ...otherProps,
      // defaults that cannot be overridden
      tracingEnabled: true,
      logs: {
        level: sfn.LogLevel.ALL,
        destination: props.logGroup,
      },
    });
  }
}
