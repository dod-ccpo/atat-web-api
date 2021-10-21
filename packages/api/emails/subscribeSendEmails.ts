import { SQSEvent } from "aws-lambda";
import { smClient } from "../utils/aws-sdk/secretsmanager";
import { createTransport, Transporter } from "nodemailer";
import { DATABASE_ERROR } from "../utils/errors";

const SMTP_SECRET = process.env.SMTP ?? "";

interface SMTPSecret {
  hostname: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Receives SQS Events for sending emails
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  console.log("EVENT RECORDS: ", event.Records);

  try {
    // get creds for smtp service
    console.log("befor secrets call: ");
    const smtp = await retrieveSecrets(SMTP_SECRET);
    console.log("after secrets call: ");
    if (smtp === "CredentialsProviderError" || smtp === undefined) {
      // 5xx type error
      console.log("SMTP value is: " + smtp);
      // TODO: add error for credentials
      throw DATABASE_ERROR;
    }
    console.log("After secrets request.");

    const smtpSecrets: SMTPSecret = JSON.parse(smtp);
    const transporter = await createTransporter(smtpSecrets);

    console.log("PORT: ", smtpSecrets.port);

    // batch message polled from queue (max 10)
    const { Records } = event;
    // body contains info needed to send emails (emails, emailType, etc.)
    const emailMessagesAndType = Records.map((record) => ({
      messageId: record.messageId,
      body: JSON.parse(record.body),
    }));

    const responses = [];
    for (const message of emailMessagesAndType) {
      if (!transporter) {
        console.log("No transporter found: ", DATABASE_ERROR);
        return undefined;
      }
      const { emails, emailType } = message.body;
      switch (emailType) {
        case "invitation":
          responses.push({
            messageId: message.messageId,
            response: await transporter.sendMail({
              to: emails,
              subject: "Invitation Test",
              text: "Test email being sent.",
              html: "<h1>Test Only</h1><p>This is only a test please ignore</p>",
            }),
          });
          break;
        case "alert":
          responses.push({
            messageId: message.messageId,
            response: await transporter.sendMail({
              to: emails,
              subject: "Alert Test",
              text: "Alert email being sent.",
              html: "<h1>Alert</h1><p>This is an Alert, please take action.</p>",
            }),
          });
          break;
        default:
          console.log(`Email type of ${emailType} is not valid. Email not sent to ${emails}`);
      }
    }
    console.log("Sent Email Responses: " + responses);
  } catch (error) {
    console.error("Could not send emails: " + error);
  }
}

async function retrieveSecrets(id: string): Promise<string | undefined> {
  try {
    const response = await smClient.getSecretValue({ SecretId: id });
    return response.SecretString;
  } catch (error) {
    // CredentialsProviderError
    console.log("Could not retrieve secret: ", error);
    return error.name;
  }
}

async function createTransporter(secrets: SMTPSecret): Promise<Transporter | undefined> {
  // config for smtp service using nodemailer
  try {
    // TODO: ask about who the emails should becoming from?
    const defaults = { from: "mfp@ccpo.mil" };
    const smtpOptions = {
      host: secrets.hostname,
      port: Number(secrets.port),
      secure: false,
      requireTSL: true,
      auth: { user: secrets.hostname, pass: secrets.password },
    };
    return createTransport(smtpOptions, defaults);
  } catch (error) {
    console.error("Error creating SMTP transporter: " + error);
    return undefined;
  }
}
