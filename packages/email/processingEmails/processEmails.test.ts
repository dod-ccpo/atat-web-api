import { processEmailRecords } from "./processEmails";
import { handler } from "./index";
import * as getSecrets from "../utils/retrieveSecrets";
import * as processEmails from "./processEmails";
import * as emailHandler from "./index";
import { generateTestSQSEvent } from "../utils/sqs";
import { v4 as uuidv4 } from "uuid";
import { SmtpConfiguration } from "../../api/emails/subscribeSendEmails";

beforeEach(() => {
  jest.clearAllMocks();
});

const secrets: SmtpConfiguration = {
  hostname: "smtp.mail.mil",
  port: 465,
  username: "postmate@sandbox.mail.mil",
  password: "password",
};

describe("processEmailRecords", function () {
  it("should return responses from emails sent", async () => {
    const body = { emails: ["test@email.mil"], emailType: "invitation", missionOwner: "Ms. Mission Owner" };
    const recordsToProcess = [
      {
        messageId: uuidv4(),
        body: body,
      },
    ];
    const sentEmailResponse = [
      {
        messageId: "ba4e7dba-c88b-4e8c-8bca-c6c5c80f0e03",
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
      },
    ];
    const processEmailsSpy = jest
      .spyOn(processEmails, "processEmailRecords")
      .mockImplementation((secrets, records) => Promise.resolve(sentEmailResponse));

    const processedEmails = await processEmailRecords(secrets, recordsToProcess);
    expect(processedEmails).toEqual(sentEmailResponse);
    expect(processEmailsSpy).toBeCalledTimes(1);
    expect(processEmailsSpy).toHaveBeenCalledWith(secrets, recordsToProcess);
  });
});

describe("handler", function () {
  const body = { emails: ["test@email.mil"], emailType: "invitation", missionOwner: "Ms. Mission Owner" };
  const validSQSEvent = generateTestSQSEvent(JSON.stringify(body));
  // mocks the secrets in the handler
  jest.spyOn(getSecrets, "retrieveSecrets").mockResolvedValue(secrets);

  it("should process emails successfully", async () => {
    const validSQSEvent = generateTestSQSEvent(JSON.stringify(body));
    const emailHandlerSpy = jest.spyOn(emailHandler, "handler");
    const consoleLogSpy = jest.spyOn(console, "log");

    const voidEmailHandler = await handler(validSQSEvent);
    expect(voidEmailHandler).toBeUndefined();
    expect(emailHandlerSpy).toHaveBeenCalledTimes(1);
    expect(emailHandlerSpy).toHaveBeenCalledWith(validSQSEvent);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    // Final console log at the end of running the function
    expect(consoleLogSpy.mock.calls[1][0]).toMatch(/Email responses after processing: /);
  });
  it("should throw an error and console log the error", async () => {
    const error = JSON.stringify({ message: "An error occurred ", code: 500 });
    // throw error while processing emails
    jest.spyOn(processEmails, "processEmailRecords").mockRejectedValue(error);
    const consoleLogSpy = jest.spyOn(console, "log");
    await handler(validSQSEvent);

    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy.mock.calls[1][0]).toEqual(`Could not send emails: ${error}`);
  });
});
