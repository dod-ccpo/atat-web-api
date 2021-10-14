import { SQSEvent } from "aws-lambda";
import { handler } from "./subscribePortfolioDraftSubmission";
import * as crypto from "crypto";

function generateTestEvent(body: string): SQSEvent {
  return {
    Records: [
      {
        body: body,
        messageId: "0",
        messageAttributes: {},
        receiptHandle: "",
        eventSource: "",
        eventSourceARN: "",
        awsRegion: "us-east-1",
        attributes: {
          ApproximateFirstReceiveTimestamp: "",
          ApproximateReceiveCount: "0",
          SentTimestamp: "",
          SenderId: "",
        },
        // The use of MD5 here is not for any cryptographic purpose. It is
        // to mock a field of a Lambda event. This is only used for the
        // purposes of a basic validation (much like CRC).
        md5OfBody: crypto.createHash("md5").update(body).digest("hex"),
      },
    ],
  };
}

describe("Test subscription handler", () => {
  it.each(["testEvent", "test", "", "4"])("should log data to stdout", async (eventBody) => {
    const event = generateTestEvent(eventBody);
    const consoleLogSpy = jest.spyOn(console, "log");
    await handler(event);
    expect(consoleLogSpy).toHaveBeenCalledWith(eventBody);
  });
});
