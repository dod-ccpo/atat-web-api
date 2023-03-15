import { CostResponse } from "../../models/cost-jobs";
import { QueueConsumer } from "../util/queueConsumer";

const COST_RESPONSE_QUEUE_URL = process.env.COST_RESPONSE_QUEUE_URL ?? "";

/**
 * A QueueConsumer for CSP responses to cost requests.
 */
class ConsumeCostResponse extends QueueConsumer<CostResponse> {
  processMessage(message: string | undefined): CostResponse | undefined {
    const { code, content } = JSON.parse(message ?? "");
    return {
      code,
      content,
    };
  }
}

const handlerClass = new ConsumeCostResponse(COST_RESPONSE_QUEUE_URL);

export const handler = handlerClass.createHandler();
