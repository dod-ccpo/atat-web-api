import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

/**
 * An SQS Queue configured as a FIFO queue.
 *
 * This is appropriate for the general use-case within the ATAT application.
 * Encryption-at-rest is enabled by default for the queue.
 *
 * The following properties will be overriden if set via `props`:
 *   - `fifo` will be set to `true`,
 *   - `contentBasedDeduplication` will be set to `true`
 *   - `encryption` will be set to `KMS_MANAGED`
 */
export class FifoQueue extends sqs.Queue {
  constructor(scope: Construct, id: string, props?: sqs.QueueProps) {
    super(scope, id, {
      ...props,
      fifo: true,
      contentBasedDeduplication: true,
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });
  }
}
