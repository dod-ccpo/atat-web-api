import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "./http";

export interface PortfolioDraftFunctionProps {
  /**
   * The API Gateway resource the route will be added to.
   */
  readonly resource: apigw.IResource;

  /**
   * The DynamoDB table where data is stored.
   */
  readonly table: dynamodb.ITable;

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
  readonly functionPropsOverride?: lambdaNodeJs.NodejsFunctionProps | undefined;
}

/**
 * Creates the required resources for a PortfolioDraft function for the ATAT API.
 *
 * The route is added to the API Gateway resource and the Lambda function is packaged and
 * created. Additionally, the necessary permissions are granted on the DynamoDB table
 * corresponding to the HTTP method specified in the props.
 */
export class PortfolioDraftFunction extends cdk.Construct {
  public readonly fn: lambda.IFunction;
  public readonly table: dynamodb.ITable;
  public readonly method: HttpMethod;
  public readonly route: apigw.Method;
  public readonly grant?: iam.Grant;

  constructor(scope: cdk.Construct, id: string, props: PortfolioDraftFunctionProps) {
    super(scope, id);
    this.table = props.table;
    this.method = props.method;
    this.fn = new lambdaNodeJs.NodejsFunction(this, "Function", {
      environment: {
        ATAT_TABLE_NAME: props.table.tableName,
      },
      entry: props.handlerPath,
      ...props.functionPropsOverride,
    });
    this.route = props.resource.addMethod(props.method, new apigw.LambdaIntegration(this.fn));
    this.grant = this.grantRequiredPermissions();
  }

  private grantRequiredPermissions(): iam.Grant | undefined {
    switch (this.method) {
      case "GET":
      case "HEAD":
        return this.table.grantReadData(this.fn);
      case "POST":
      case "PUT":
      case "DELETE":
        return this.table.grantReadWriteData(this.fn);
      default:
        cdk.Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
  }
}
