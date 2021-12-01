import { Duration, aws_stepfunctions_tasks as sfnTasks } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface SfnTasksProps {
  /**
   * The props for a Lambda invoking task
   */
  readonly sfnTask: sfnTasks.LambdaInvokeProps;
}

/**
 * Creates a Lambda invoking Task that represents a State in the workflow of a
 * State Machine once execution starts.
 */
export class SfnLambdaInvokeTask extends Construct {
  /**
   * A Step Function Lambda invoking Task used within a State Machine
   */
  readonly sfnTask: sfnTasks.LambdaInvoke;

  constructor(scope: Construct, id: string, props: SfnTasksProps) {
    super(scope, id);
    const sfnTask = new sfnTasks.LambdaInvoke(this, id, {
      timeout: Duration.seconds(60),
      ...props.sfnTask,
    });

    this.sfnTask = sfnTask;
  }
}
