import * as apigw from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "../http";
import * as iam from "@aws-cdk/aws-iam";
import { Fn } from "@aws-cdk/core";

export interface ApiFunctionProps {
  /**
   * The API Gateway resource the route will be added to.
   */
  // readonly resource: apigw.IResource;

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

  /**
   * The CfnFunction logicalId, used for templating the api yaml.
   */
  public readonly logicalL1: lambda.CfnFunction;

  protected constructor(scope: cdk.Construct, id: string, props: ApiFunctionProps) {
    super(scope, id);
    this.method = props.method; // method is not needed, defined in api spec
    this.fn = new lambdaNodeJs.NodejsFunction(this, "Function", {
      entry: props.handlerPath,
      ...props.functionPropsOverride,
    });
    this.fn.addPermission("AllowApiGatwewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    this.logicalL1 = this.fn.node.defaultChild as lambda.CfnFunction;
    // this.logicalL1.overrideLogicalId(this.fn.toString());
  }
  // this.route = props.resource.addMethod(props.method, new apigw.LambdaIntegration(this.fn)); // this is ignored by apispec
}
