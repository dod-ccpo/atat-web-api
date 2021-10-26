import nodemailer from "nodemailer";
import { SmtpConfiguration } from "../utils/retrieveSecrets";
import { SentMessageInfo } from "nodemailer/lib/smtp-connection";

const SMTP_SECRET_NAME = process.env.SMTP ?? "";
export interface SmtpResponse {
  messageId: string;
  response: SentMessageInfo;
}

export interface emailRecord {
  messageId: string;
  body: { emails: string[]; emailType: string; missionOwner: string };
}

/**
 * Process SQS Events for sending emails
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function processEmailRecords(secrets: SmtpConfiguration, records: emailRecord[]): Promise<any> {
  const defaults = { from: "mfp@ccpo.mil" };
  const smtpOptions = {
    host: secrets.hostname,
    port: Number(secrets.port),
    secure: false,
    requireTLS: true,
    auth: { user: secrets.username, pass: secrets.password },
  };
  const transporter = await nodemailer.createTransport(smtpOptions, defaults);

  const emailResponses = [];
  for (const message of records) {
    const { emails, emailType, missionOwner } = message.body;
    // emailResponses.push({ messageId: message.messageId, response: [{}] });
    switch (emailType) {
      case "invitation":
        emailResponses.push({
          messageId: message.messageId,
          response: await transporter.sendMail({
            to: emails,
            subject: "Invitation Test",
            text: `Test email being sent. ${missionOwner} has invited you to the Cloud.`,
            html: `<h1>Test Only</h1><p>This is only a test for an invitation by ${missionOwner}</p>`,
          }),
        });
        break;

      case "alert":
        console.log("Alert Switch: ");
        emailResponses.push({
          messageId: message.messageId,
          response: await transporter.sendMail({
            to: emails,
            subject: "Alert Test",
            text: `${missionOwner} you are getting this email because of an alert.`,
            html: `<h1>Alert</h1><p>This is an alert for ${missionOwner}, please take action.</p>`,
          }),
        });
        break;

      default:
        console.log(`Email type of ${emailType} is not valid. Email not sent to ${emails}`);
    }
  }
  console.log("Emails successfully sent");
  return emailResponses;
}
