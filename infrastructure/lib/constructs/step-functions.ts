import * as cdk from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";

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
export class SfnLambdaInvokeTask extends cdk.Construct {
  /**
   * A Step Function Lambda invoking Task used within a State Machine
   */
  readonly sfnTask: sfnTasks.LambdaInvoke;

  constructor(scope: cdk.Construct, id: string, props: SfnTasksProps) {
    super(scope, id);
    const sfnTask = new sfnTasks.LambdaInvoke(this, id, {
      timeout: cdk.Duration.seconds(60),
      ...props.sfnTask,
    });

    this.sfnTask = sfnTask;
  }
}

export interface SfnPassProps extends sfn.PassProps {
  /**
   * The props for a Pass state
   */
  readonly sfnPass?: sfn.PassProps;
}

/**
 * Creates a Pass that represents a State in the workflow of a
 * State Machine that passes the input to the output.
 */
export class SfnPassState extends cdk.Construct {
  /**
   * Props for a Pass state in a State Machine
   */
  readonly sfnPass: sfn.Pass;

  constructor(scope: cdk.Construct, id: string, props: SfnPassProps) {
    super(scope, id);
    this.sfnPass = new sfn.Pass(this, id, props.sfnPass ?? {});
  }
}
