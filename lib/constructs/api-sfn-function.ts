import { Duration } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { HttpMethod } from "../http";

export interface ApiSfnFunctionProps {
  /**
   * The HTTP method this route applies to.
   */
  readonly method: HttpMethod;

  /**
   * The local path where the handler file is located.
   */
  readonly handlerPath: string;

  /**
   * Any additional props to apply to the NodeJsFunction.
   *
   * Additional prop values specified here will override the defaults, including
   * the `entry` and `environment` if one is provided in this struct. Be careful.
   */
  readonly functionPropsOverride?: lambdaNodeJs.NodejsFunctionProps;

  /**
   * The State Machine that will start execution when this function
   * is called.
   */
  readonly stateMachine?: sfn.IStateMachine;

  /**
   * The VPC associated with this deployment (if present)
   */
  readonly vpc?: ec2.IVpc;
}

export class ApiSfnFunction extends Construct {
  /**
   * Required resources
   * @param fn - the NodejsFunction, named with the @id passed to the function
   */
  public readonly fn: lambda.Function;

  /**
   * The HTTP method that a route should be created for.
   */
  public readonly method: HttpMethod;

  /**
   * The State Machine resource that gets created.
   */
  public readonly stateMachine?: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: ApiSfnFunctionProps) {
    super(scope, id);

    this.method = props.method;
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      vpc: props.vpc,
      ...props.functionPropsOverride,
    });

    if (props.stateMachine) {
      // State Machine service
      this.stateMachine = props.stateMachine;
      this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
      this.stateMachine.grantStartExecution(this.fn);
    }
  }
}
