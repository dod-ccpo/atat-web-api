import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "../http";
import { ApiFunction, ApiFunctionProps } from "./api-function";
import * as sqs from "@aws-cdk/aws-sqs";
import { LambdaInsightsVersion } from "@aws-cdk/aws-lambda";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import * as lambda from "@aws-cdk/aws-lambda";

export interface ApiSQSFunctionProps extends ApiFunctionProps {
  /**
   * The DynamoDB table where data is stored.
   */
  readonly queue: sqs.IQueue;
}

/**
 * Creates the required resources for a PortfolioDraft function for the ATAT API.
 *
 * The route is added to the API Gateway resource and the Lambda function is packaged and
 * created. Additionally, the necessary permissions are granted on the DynamoDB table
 * corresponding to the HTTP method specified in the props.
 */
export class ApiSQSFunction extends ApiFunction {
  /**
   * The sqs queue
   */
  public readonly queue: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: ApiSQSFunctionProps) {
    super(scope, id, props);
    this.queue = props.queue;
    this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
    this.grantRequiredQueuePermissions();
  }

  private grantRequiredQueuePermissions(): iam.Grant | undefined {
    switch (this.method) {
      // Read-Only operations
      case HttpMethod.GET:
      case HttpMethod.HEAD:
        return this.queue.grantConsumeMessages(this.fn);
      // Read-Write operations
      case HttpMethod.POST:
      case HttpMethod.PUT:
      case HttpMethod.DELETE:
        return this.queue.grantSendMessages(this.fn);
      default:
        // This will allow Synthesis to continue; however, the error will stop the
        // CDK from moving forward with a diff or deploy action.
        cdk.Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
  }
}

export interface ApiSQSDynamoDBFunctionProps extends ApiFunctionProps {
  /**
   * The DynamoDB table where data is stored.
   */
  readonly queue: sqs.IQueue;
  /**
   * The DynamoDB table where data is stored.
   */
  readonly table: dynamodb.ITable;
}

export class ApiSQSDynamoDBFunction extends ApiFunction {
  /**
   * The SQS queue
   */
  public readonly queue: sqs.IQueue;
  /**
   * The DynamoDB table.
   */
  public readonly table: dynamodb.ITable;

  constructor(scope: cdk.Construct, id: string, props: ApiSQSDynamoDBFunctionProps) {
    super(scope, id, props);
    this.queue = props.queue;
    this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
    this.table = props.table;
    this.fn.addEnvironment("ATAT_TABLE_NAME", props.table.tableName);
    this.grantRequiredQueuePermissions();
    this.grantRequiredTablePermissions();
    this.fn.addEventSource(new SqsEventSource(this.queue));
  }

  private grantRequiredQueuePermissions(): iam.Grant | undefined {
    switch (this.method) {
      // Read-Only operations
      case HttpMethod.GET:
      case HttpMethod.HEAD:
        return this.queue.grantConsumeMessages(this.fn);
      // Read-Write operations
      case HttpMethod.POST:
      case HttpMethod.PUT:
      case HttpMethod.DELETE:
        return this.queue.grantSendMessages(this.fn);
      default:
        // This will allow Synthesis to continue; however, the error will stop the
        // CDK from moving forward with a diff or deploy action.
        cdk.Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
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
        cdk.Annotations.of(this).addError("Unknown HTTP method " + this.method);
        return undefined;
    }
  }
}
