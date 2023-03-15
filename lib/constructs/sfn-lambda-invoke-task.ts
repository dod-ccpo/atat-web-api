import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as sfnTasks from "aws-cdk-lib/aws-stepfunctions-tasks";

type TaskProps = {
  id: string;
  props: sfnTasks.LambdaInvokeProps;
};
export type TasksMap = { [name: string]: sfnTasks.LambdaInvoke };

/**
 * Creates a mapping from an array of tasks, where each task is used for
 * constructing the State Machine workflow. the id
 *
 * @param scope - the stack which the task belongs to (e.g., this)
 * @param tasks - array of task objects to be used for creating SfnLambdaTask
 * @returns - an sfnTasks object with all tasks mapped by the id provided
 */
export function mapTasks(scope: Construct, tasks: Array<TaskProps>): TasksMap {
  return tasks.reduce(
    (mappedTasks, task) => ({
      ...mappedTasks,
      [task.id]: new sfnTasks.LambdaInvoke(scope, task.id, {
        timeout: Duration.minutes(6),
        ...task.props,
      }),
    }),
    {}
  );
}
