import { PreTokenGenerationTriggerEvent } from "aws-lambda";
import { translateGroups } from "./groups";

export async function handler(event: PreTokenGenerationTriggerEvent): Promise<PreTokenGenerationTriggerEvent> {
  // This currently sets up the groups. If additional actions need to be taken, like adding users to a database or
  // triggering other events, they should be added as additional functions and called within this handler.
  event.response.claimsOverrideDetails = {
    groupOverrideDetails: {
      groupsToOverride: translateGroups(event),
    },
  };
  return event;
}
