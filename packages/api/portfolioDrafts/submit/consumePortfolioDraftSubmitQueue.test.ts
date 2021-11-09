import { SQSEvent } from "aws-lambda";
import { handler } from "./consumePortfolioDraftSubmitQueue";
import { mockClient } from "aws-sdk-client-mock";
import { sfnClient } from "../../utils/aws-sdk/stepFunctions";
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

const sfnMock = mockClient(sfnClient);
const consoleLogSpy = jest.spyOn(console, "log");
beforeEach(() => {
  sfnMock.reset();
  consoleLogSpy.mockReset();
});

describe("Test consumer handler", () => {
  it.each(["testEvent", "test", "", "4"])("should log data to stdout", async (eventBody) => {
    const event = generateTestEvent(eventBody);
    await handler(event);
    expect(consoleLogSpy).toBeCalledWith(`Sent Record: ${eventBody}`);
    expect(consoleLogSpy).toHaveBeenCalledTimes(3);
  });
});
