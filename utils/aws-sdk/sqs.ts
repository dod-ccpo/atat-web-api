import { SQSClient } from "@aws-sdk/client-sqs";
import { logger } from "../logging";

// Create SQS service object.
export const sqsClient = new SQSClient({ useFipsEndpoint: true, logger });
