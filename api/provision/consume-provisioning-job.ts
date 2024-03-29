import { QueueConsumer } from "../util/queueConsumer";
import { HothProvisionRequest } from "../client";

const PROVISIONING_QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";

class ConsumeProvisioningJob extends QueueConsumer<HothProvisionRequest> {
  processMessage(message: string | undefined): HothProvisionRequest | undefined {
    return JSON.parse(message ?? "");
  }
}

const handlerClass = new ConsumeProvisioningJob(PROVISIONING_QUEUE_URL);

export const handler = handlerClass.createHandler();
