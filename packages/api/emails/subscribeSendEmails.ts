import { SQSEvent } from "aws-lambda";
import { smClient } from "../utils/aws-sdk/secretsmanager";
import { createTransport } from "nodemailer";

const SMTP_SECRET = process.env.SMTP;

/**
 * Receives SQS Events for sending emails
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  // get creds for smtp service
  const smtp = retrieveSecrets(SMTP_SECRET);

  // config for smtp service using nodemailer
  const defaults = { from: "julius.fitzhugh-ctr@ccpo.mil" };
  const smtpOptions = {
    host: smtp.hostname,
    port: Number(smtp.port),
    secure: false,
    // requireTSL: true,
    auth: { user: smtp.hostname, pass: smtp.password },
  };
  const transporter = createTransport(smtpOptions, defaults);

  // batch message polled from queue (max 10)
  const { Records } = event;
  const messagesEmailsAndTypes = Records.map((record) => {
    // body contains info needed to send emails (emails, emailType, etc.)
    return { messageId: record.messageId, body: JSON.parse(record.body) };
  });

  try {
    // ? may want to only process one message if messages send different emails types
    for (const message of messagesEmailsAndTypes) {
      const response = await transporter.sendMail({
        to: message.body.emails,
        subject: "Invitation Test",
        text: "Test email being sent.",
        html: "<h1>Test Only</h1><p>This is only a test please ignore</p>",
      });
      console.log("Message sent: ", message.messageId);
      console.log("Response: ", response);
    }
  } catch (error) {
    // TODO: send to DLQ
  }
}

async function retrieveSecrets(id: string) {
  try {
    const response = await smClient.getSecretValue({ SecretId: id });
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error("Could not retrieve secret: ", error);
    return undefined;
  }
}
