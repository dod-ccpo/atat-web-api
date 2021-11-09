import * as cdk from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as iam from "@aws-cdk/aws-iam";
import { ApiSQSFunction, ApiSQSFunctionProps } from "./api-sqs-function";

export interface ApiStepFnsSQSFunctionProps extends ApiSQSFunctionProps {
  /**
   * The State Machine that will start execution when this function
   * is called.
   */
  readonly stateMachine: sfn.IStateMachine;
}

/**
 * Creates a function resource with access to a queue and Step fns for the ATAT API.
 *
 * This function polls from a SQS as an event source and starts the execution of
 * a State Machine with the AWS Step Functions service. The function is added
 * with the packaged Lambda function and granted necessary permissions on the SQS
 * and State Machine.
 */
export class ApiStepFnsSQSFunction extends ApiSQSFunction {
  /**
   * A function with the permissions to start execution of a State Machine
   */
  readonly stateMachine: sfn.IStateMachine;

  constructor(scope: cdk.Construct, id: string, props: ApiStepFnsSQSFunctionProps) {
    super(scope, id, props);
    this.stateMachine = props.stateMachine;
    this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
    this.grantRequiredStateMachinePermissions();
  }

  private grantRequiredStateMachinePermissions(): iam.Grant | undefined {
    return this.stateMachine.grantStartExecution(this.fn);
  }
}
