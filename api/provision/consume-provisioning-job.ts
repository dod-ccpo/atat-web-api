import { ProvisionRequest } from "../../models/provisioning-jobs";
import { QueueConsumer } from "../util/queueConsumer";

const PROVISIONING_QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";

class ConsumeProvisioningJob extends QueueConsumer<ProvisionRequest> {
  processMessage(message: string | undefined): ProvisionRequest | undefined {
    return JSON.parse(message ?? "");
  }
}

const handlerClass = new ConsumeProvisioningJob(PROVISIONING_QUEUE_URL);

export const handler = handlerClass.createHandler();
