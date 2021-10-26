import { processEmailRecords } from "./processEmails";
import { handler } from "./index";
import * as getSecrets from "../utils/retrieveSecrets";
import * as processEmails from "./processEmails";
import * as emailHandler from "./index";
import { generateTestSQSEvent } from "../utils/sqs";
import { v4 as uuidv4 } from "uuid";
import { SmtpConfiguration } from "../utils/retrieveSecrets";

const secrets: SmtpConfiguration = {
  hostname: "smtp.mail.mil",
  port: 465,
  username: "postmate@sandbox.mail.mil",
  password: "password",
};

const queueMessageId = uuidv4();
const sentEmailResponse = {
  messageId: queueMessageId,
  response: {
    accepted: ["lostmy@hand.mil", "monkey@lizard.mil"],
    rejected: [],
    envelopeTime: 497,
    messageTime: 65,
    messageSize: 734,
    response: "250 Great success",
    envelope: {
      from: "mail@test.mil",
      to: ["lostmy@hand.mil", "monkey@lizard.mil"],
    },
    messageId: "<89348fda-5296-62a3-aea5-73c26a858b45@test.mil>",
  },
};
const body = { emails: ["test@email.mil"], emailType: "invitation", missionOwner: "Ms. Mission Owner" };
const differentEmailTypes = [
  { ...body, emailType: "invitation" },
  { ...body, emailType: "alert" },
];
const recordsToProcess = [
  {
    messageId: queueMessageId,
    body: body,
  },
];

// mocks the secrets in the test
const secretsSpy = jest.spyOn(getSecrets, "retrieveSecrets").mockImplementation((secrets: any) => secrets);
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn((): any => ({
      accepted: ["lostmy@hand.mil", "monkey@lizard.mil"],
      rejected: [],
      envelopeTime: 497,
      messageTime: 65,
      messageSize: 734,
      response: "250 Great success",
      envelope: {
        from: "mail@test.mil",
        to: ["lostmy@hand.mil", "monkey@lizard.mil"],
      },
      messageId: "<89348fda-5296-62a3-aea5-73c26a858b45@test.mil>",
    })),
  }),
}));

beforeEach(() => {
  secretsSpy.mockReset();
  jest.clearAllMocks();
});

describe("processEmailRecords", function () {
  it.each(differentEmailTypes)("should return responses from emails sent", async (emailRequestBody) => {
    const processEmailsSpy = jest.spyOn(processEmails, "processEmailRecords");
    const emailMessages = [{ messageId: queueMessageId, body: emailRequestBody }];

    const processedEmails = await processEmailRecords(secrets, emailMessages);
    console.log("different EMAILS: " + JSON.stringify(processedEmails));
    const firstEmailResponse = processedEmails[0];

    expect(firstEmailResponse).toEqual(sentEmailResponse);
    expect(processedEmails[0].messageId).toEqual(queueMessageId);
    expect(processEmailRecords).toHaveBeenCalledTimes(1);
    expect(processEmailsSpy).toBeCalledTimes(1);
    expect(processEmailsSpy).toHaveBeenCalledWith(secrets, emailMessages);
  });
  it("should return an error when trying to send an email", async () => {
    const error = "Could not send emails: Error message";
    const processEmailsSpy = jest.spyOn(processEmails, "processEmailRecords").mockRejectedValue(error);

    try {
      const processedEmails = await processEmailRecords("" as any, recordsToProcess);
    } catch (e) {
      expect(e).toBe(error);
    }
    processEmailsSpy.mockReset();
  });
});

describe("handler", function () {
  it.each(differentEmailTypes)("should process emails successfully", async (eventBody) => {
    const sqsEvent = generateTestSQSEvent(JSON.stringify(eventBody));
    const emailHandlerSpy = jest.spyOn(emailHandler, "handler");
    const consoleLogSpy = jest.spyOn(console, "log");

    const voidEmailHandler = await handler(sqsEvent);
    expect(voidEmailHandler).toBeUndefined();
    expect(emailHandlerSpy).toHaveBeenCalledTimes(1);
    expect(emailHandlerSpy).toHaveBeenCalledWith(sqsEvent);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    // Final console log at the end of running the function
    expect(consoleLogSpy.mock.calls[1][0]).toMatch(/Email responses after processing: /);
  });
  it("should throw an error and console log the error", async () => {
    const error = JSON.stringify({ message: "An error occurred ", code: 500 });
    jest.spyOn(processEmails, "processEmailRecords").mockImplementation((): any => {
      throw error;
    });
    const consoleLogSpy = jest.spyOn(console, "log");

    try {
      await handler(generateTestSQSEvent(JSON.stringify(body)));
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toEqual(new Error(`Could not send emails: ${error}`));
    }
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });
});
