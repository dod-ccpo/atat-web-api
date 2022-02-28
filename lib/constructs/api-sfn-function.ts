import { Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as iam from "aws-cdk-lib/aws-iam";
import { HttpMethod } from "../../utils/http";
import { Construct } from "constructs";

/**
 * An IAM service principal for the API Gateway service, used to grant Lambda
 * invocation permissions.
 */
const APIGW_SERVICE_PRINCIPAL = new iam.ServicePrincipal("apigateway.amazonaws.com");

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
  readonly stateMachine: sfn.IStateMachine;
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
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: ApiSfnFunctionProps) {
    super(scope, id);

    this.method = props.method;
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      // vpc: props.lambdaVpc,
      memorySize: 256,
      timeout: Duration.seconds(5),
      ...props.functionPropsOverride,
    });

    // APIGW service
    this.fn.addPermission("AllowApiGatewayInvoke", { principal: APIGW_SERVICE_PRINCIPAL });
    // editing name from API spec
    (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");

    // State Machine service
    this.stateMachine = props.stateMachine;
    this.fn.addEnvironment("SFN_ARN", props.stateMachine.stateMachineArn);
    this.stateMachine.grantStartExecution(this.fn);
  }
}
