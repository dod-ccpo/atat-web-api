import nodemailer from "nodemailer";
import { SmtpConfiguration } from "../utils/retrieveSecrets";
import { SentMessageInfo } from "nodemailer/lib/smtp-connection";

export interface SmtpResponse {
  messageId: string;
  response: SentMessageInfo;
}

export interface EmailRecord {
  messageId: string;
  body: { emails: string[]; emailType: string; missionOwner: string };
}

/**
 * Process SQS Events for sending emails
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function processEmailRecords(secrets: SmtpConfiguration, records: EmailRecord[]): Promise<any> {
  const defaults = { from: "mfp@ccpo.mil" };
  const smtpOptions = {
    host: secrets.hostname,
    port: Number(secrets.port),
    // Our current SMTP configuration requires the usage of STARTTLS rather
    // than using TLS directly. Setting secure to false allows nodemailer to initiate
    // the connection and requireTLS ensures that nodemailer always tries to
    // upgrade using STARTTLS, regardless of whether the server advertises
    // STARTTLS support. See https://nodemailer.com/smtp/
    // Nodemailer will not send the mail if it cannot upgrade a connection with
    // requireTLS set to true.
    // TODO: Investigate using TLS on port 465 instead of STARTTLS.
    secure: false,
    requireTLS: true,
    auth: { user: secrets.username, pass: secrets.password },
  };
  const transporter = nodemailer.createTransport(smtpOptions, defaults);

  const emailResponses = [];
  let smtpServiceResponse;
  for (const message of records) {
    const { emails, emailType, missionOwner } = message.body;
    switch (emailType) {
      case "invitation":
        smtpServiceResponse = await transporter.sendMail({
          to: emails,
          subject: "Invitation Test",
          text: `Test email being sent. ${missionOwner} has invited you to the Cloud.`,
          html: `<h1>Test Only</h1><p>This is only a test for an invitation by ${missionOwner}</p>`,
        });
        emailResponses.push({
          messageId: message.messageId,
          response: smtpServiceResponse,
        });
        break;

      case "alert":
        smtpServiceResponse = await transporter.sendMail({
          to: emails,
          subject: "Alert Test",
          text: `${missionOwner} you are getting this email because of an alert.`,
          html: `<h1>Alert</h1><p>This is an alert for ${missionOwner}, please take action.</p>`,
        });
        emailResponses.push({
          messageId: message.messageId,
          response: smtpServiceResponse,
        });
        break;

      default:
        console.log(`Email type of ${emailType} is not valid. Email not sent to ${emails}`);
    }
  }
  console.log("Emails successfully sent");
  return emailResponses;
}
