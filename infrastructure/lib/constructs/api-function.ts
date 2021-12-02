import {
  aws_apigateway as apigw,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodeJs,
  aws_secretsmanager as secretsmanager,
} from "aws-cdk-lib";
import { Construct } from "constructs";

import { HttpMethod } from "../http";

/**
 * An IAM service principal for the API Gateway service, used to grant Lambda
 * invocation permissions.
 */
const APIGW_SERVICE_PRINCIPAL = new iam.ServicePrincipal("apigateway.amazonaws.com");

export interface ApiFunctionProps {
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
   * The VPC where resources should be created
   */
  readonly lambdaVpc?: ec2.IVpc;
  /**
   * A prop to determine if the underlying Lambda function has read permissions
   * for secrets managers.
   */
  readonly smtpSecrets?: secretsmanager.ISecret;
}

export abstract class ApiFunction extends Construct {
  /**
   * The underlying Lambda function for the API call.
   */
  public readonly fn: lambda.Function;

  /**
   * The HTTP method that a route should be created for.
   */
  public readonly method: HttpMethod;

  /**
   * The API gateway Method resource that gets created.
   */
  public readonly route: apigw.Method;

  protected constructor(scope: Construct, id: string, props: ApiFunctionProps) {
    super(scope, id);
    this.method = props.method;
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      vpc: props.lambdaVpc,
      ...props.functionPropsOverride,
    });
    this.fn.addPermission("AllowApiGatewayInvoke", { principal: APIGW_SERVICE_PRINCIPAL });
    (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");
    if (props.smtpSecrets) {
      props.smtpSecrets.grantRead(this.fn);
    }
  }
}
