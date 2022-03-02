import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as sfnTasks from "aws-cdk-lib/aws-stepfunctions-tasks";

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

type TaskProps = {
  id: string;
  props: sfnTasks.LambdaInvokeProps;
};
export type TasksMap = { [name: string]: SfnLambdaInvokeTask };

/**
 * Creates a mapping from an array of tasks, where each task is used for
 * constructing the State Machine workflow. the id
 *
 * @param scope - the stack which the task belongs to (e.g., this)
 * @param tasks - array of task objects to be used for creating SfnLambdaTask
 * @returns - an sfnTasks object with all tasks mapped by the id provided
 */
export function mapTasks(scope: Construct, tasks: Array<TaskProps>): TasksMap {
  const sfnTasks: TasksMap = {};
  for (const task of tasks) {
    sfnTasks[task.id] = new SfnLambdaInvokeTask(scope, task.id, { sfnTask: task.props });
  }
  return sfnTasks;
}
