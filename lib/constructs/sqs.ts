import * as sqs from "aws-cdk-lib/aws-sqs";
import { QueueProps } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface SQSProps extends QueueProps {
  /**
   * Props to override the default props of the created SQS
   */
  overrideSqsProps?: QueueProps;
  /**
   * Environment name to help differentiate the queues made
   */
  environmentName: string;
}

/**
 * A basic SQS queue
 * - defaults to an FIFO queue
 */
export class Queue extends Construct {
  /**
   * The SQS resource that gets created.
   */
  public readonly sqs: sqs.IQueue;

  constructor(scope: Construct, id: string, props: SQSProps) {
    super(scope, id);
    this.sqs = new sqs.Queue(scope, `${props.environmentName}${id}Queue`, {
      fifo: true,
      contentBasedDeduplication: true,
      ...props.overrideSqsProps,
    });
  }
}
