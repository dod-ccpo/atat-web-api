import * as iam from "@aws-cdk/aws-iam";
import * as cdk from "@aws-cdk/core";
import { HttpMethod } from "../http";
import { ApiDynamoDBFunction, ApiDynamoDBFunctionProps } from "./api-dynamodb-function";
import * as sqs from "@aws-cdk/aws-sqs";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";

export interface ApiSQSFunctionProps extends ApiDynamoDBFunctionProps {
  /**
   * The SQS queue where data is sent
   */
  readonly queue: sqs.IQueue;
  /**
   * Optional param to create an SQS event source to recieve queue data
   */
  readonly createEventSource?: any;
}

/**
 * Creates the required resources for a PortfolioDraft function for the ATAT API.
 *
 * The route is added to the API Gateway resource and the Lambda function is packaged and
 * created. Additionally, the necessary permissions are granted on the DynamoDB table
 * corresponding to the HTTP method specified in the props.
 */
export class ApiSQSFunction extends ApiDynamoDBFunction {
  /**
   * The SQS queue where data is sent
   */
  public readonly queue: sqs.IQueue;
  /**
   * Optional param to create an SQS event source to recieve queue data
   */
  public readonly createEventSource?: boolean;

  constructor(scope: cdk.Construct, id: string, props: ApiSQSFunctionProps) {
    super(scope, id, props);
    this.queue = props.queue;
    this.fn.addEnvironment("ATAT_QUEUE_URL", props.queue.queueUrl);
    this.grantRequiredQueuePermissions();
    // creating an EventSource allows the fn to subscribe to the queue
    if (props.createEventSource) {
      this.fn.addEventSource(new SqsEventSource(this.queue));
    }
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
