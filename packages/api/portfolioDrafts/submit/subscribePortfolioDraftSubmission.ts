import { SQSEvent } from "aws-lambda";

/**
 * Receives SQS Events and logs the MessageBody
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  event.Records.map((record) => record.body).forEach((body) => console.log(body));
}
