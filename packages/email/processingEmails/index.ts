import { SQSEvent } from "aws-lambda";
import { processEmailRecords } from "./processEmails";
import { retrieveSecrets } from "../utils/retrieveSecrets";

const SMTP_SECRET_NAME = process.env.SMTP ?? "";

/**
 * Receives SQS Events for sending emails
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  console.log("EVENT RECORDS: ", event.Records);
  const smtpSecrets = await retrieveSecrets(SMTP_SECRET_NAME);
  // console.log("SMTP value is: " + smtpSecrets.port);

  // batch message polled from queue (max 10)
  // currently set to 1 since if the whole batch fails and retry duplicate
  // emails will be sent.
  const { Records } = event;
  // body contains info needed to send emails (emails, emailType, etc.)
  const emailRecordsToProcess = Records.map((record) => ({
    messageId: record.messageId,
    body: JSON.parse(record.body),
  }));

  try {
    const processedEmails = await processEmailRecords(smtpSecrets, emailRecordsToProcess);
    console.log("Email responses after processing: " + processedEmails);
  } catch (error) {
    console.log("Could not send emails: " + error);
  }
}
