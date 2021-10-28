import * as apigw from "@aws-cdk/aws-apigateway";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
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
  readonly lambdaVpc: ec2.IVpc;
}

export abstract class ApiFunction extends cdk.Construct {
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

  protected constructor(scope: cdk.Construct, id: string, props: ApiFunctionProps) {
    super(scope, id);
    this.method = props.method;
    this.fn = new lambdaNodeJs.NodejsFunction(this, "PackagedFunction", {
      entry: props.handlerPath,
      vpc: props.lambdaVpc,
      ...props.functionPropsOverride,
    });
    this.fn.addPermission("AllowApiGatewayInvoke", { principal: APIGW_SERVICE_PRINCIPAL });
    (this.fn.node.defaultChild as lambda.CfnFunction).overrideLogicalId(id + "Function");
  }
}
