import { SQSClient } from "@aws-sdk/client-sqs";
import { SQSEvent } from "aws-lambda";
import crypto from "crypto";

// Create SQS service object.
export const sqsClient = new SQSClient({});

// not sure this is the best place, but placed here to prevent duplication
export function generateTestSQSEvent(body: string): SQSEvent {
  return {
    Records: [
      {
        body: body,
        messageId: "2e1424d4-f796-459a-8184-9c92662be6da",
        messageAttributes: {},
        receiptHandle: "AQEBzWwaftRI0KuVm4tP+/7q1rGgNqicHq...",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:us-gov-west-1:123456789012:my-queue",
        awsRegion: "us-east-1",
        attributes: {
          ApproximateFirstReceiveTimestamp: "1545082650649",
          ApproximateReceiveCount: "1",
          SentTimestamp: "1545082650636",
          SenderId: "AIDAIENQZJOLO23YVJ4VO",
        },
        // The use of MD5 here is not for any cryptographic purpose. It is
        // to mock a field of a Lambda event. This is only used for the
        // purposes of a basic validation (much like CRC).
        md5OfBody: crypto.createHash("md5").update(body).digest("hex"),
      },
    ],
  };
}
