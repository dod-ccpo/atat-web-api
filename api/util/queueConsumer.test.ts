import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { QueueConsumer } from "./queueConsumer";

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

describe("QueueConsumer Tests", () => {
  it("Replace this once we break out common tests from start-provisioning-job.test.ts", async () => {
    const queueConsumer = new MockConsumer("a url");
  });
});

// TODO: break out common tests to here using this (or similar) mock implementation
class MockConsumer extends QueueConsumer<string> {
  processMessage(message: string | undefined): string {
    return "processed";
  }
}
