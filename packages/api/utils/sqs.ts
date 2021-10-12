import { SQSClient } from "@aws-sdk/client-sqs";
import * as AWSXRay from "aws-xray-sdk";

// Create SQS service object.
export const sqsClient = AWSXRay.captureAWSv3Client(new SQSClient({}));
