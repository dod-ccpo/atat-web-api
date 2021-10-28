import { PreAuthenticationTriggerEvent } from "aws-lambda";

export async function handler(event: PreAuthenticationTriggerEvent): Promise<PreAuthenticationTriggerEvent> {
  // currently returning the event passed to lambda on trigger
  // should serve as a baseline for log details (may need ajustments/ parsing to clean up)
  return event;
}
