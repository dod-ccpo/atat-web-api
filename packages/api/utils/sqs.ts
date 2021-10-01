import { SQSClient } from "@aws-sdk/client-sqs";

// Create SQS service object.
const sqsClient = new SQSClient({});
export { sqsClient };
