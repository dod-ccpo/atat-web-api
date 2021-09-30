import { SQSClient } from "@aws-sdk/client-sqs";
// Set the AWS Region.
const REGION = "us-gov-west-1"; // e.g. "us-east-1"
// Create SNS service object.
const sqsClient = new SQSClient({ region: REGION });
export { sqsClient };
