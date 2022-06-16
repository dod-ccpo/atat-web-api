import { mockClient } from "aws-sdk-client-mock";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { QueueConsumer } from "./queueConsumer";

const sqsMock = mockClient(sqsClient);
beforeEach(() => {
  sqsMock.reset();
});

// TODO: break out common tests to here using this (or similar) mock implementation
class MockConsumer extends QueueConsumer<string> {
  processMessage(message: string | undefined): string {
    return "processed";
  }
}
