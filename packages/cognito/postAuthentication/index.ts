import { PostAuthenticationTriggerEvent } from "aws-lambda";

export async function handler(event: PostAuthenticationTriggerEvent): Promise<PostAuthenticationTriggerEvent> {
  // currently returning the event passed to lambda on trigger
  // should serve as a baseline for log details (may need ajustments/ parsing to clean up)
  console.log(JSON.stringify(event));
  return event;
}
