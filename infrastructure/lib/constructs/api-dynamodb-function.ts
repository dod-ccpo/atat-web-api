import { Annotations, aws_dynamodb as dynamodb, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";
import { HttpMethod } from "../http";
import { ApiFunction, ApiFunctionProps } from "./api-function";

export interface ApiDynamoDBFunctionProps extends ApiFunctionProps {
  /**
   * The DynamoDB table where data is stored.
   */
  readonly table: dynamodb.ITable;
}

/**
 * Creates the required resources for a PortfolioDraft function for the ATAT API.
 *
 * The route is added to the API Gateway resource and the Lambda function is packaged and
 * created. Additionally, the necessary permissions are granted on the DynamoDB table
 * corresponding to the HTTP method specified in the props.
 */
export class ApiDynamoDBFunction extends ApiFunction {
  /**
   * The DynamoDB table.
   */
  public readonly table: dynamodb.ITable;

  constructor(scope: Construct, id: string, props: ApiDynamoDBFunctionProps) {
    super(scope, id, props);
    this.table = props.table;
    this.fn.addEnvironment("ATAT_TABLE_NAME", props.table.tableName);
    this.grantRequiredTablePermissions();
  }

  private grantRequiredTablePermissions(): iam.Grant | undefined {
    switch (this.method) {
      // Read-Only operations
      case HttpMethod.GET:
      case HttpMethod.HEAD:
        return this.table.grantReadData(this.fn);
      // Read-Write operations
      case HttpMethod.POST:
      case HttpMethod.PUT:
      case HttpMethod.DELETE:
        return this.table.grantReadWriteData(this.fn);
      default:
        // This will allow Synthesis to continue; however, the error will stop the
        // CDK from moving forward with a diff or deploy action.
        Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
  }
}
