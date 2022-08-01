import { SQSClient } from "@aws-sdk/client-sqs";
import { logger } from "../logging";
import { tracer } from "../tracing";

// Create SQS service object.
export const sqsClient = tracer.captureAWSv3Client(new SQSClient({ useFipsEndpoint: true, logger }));
