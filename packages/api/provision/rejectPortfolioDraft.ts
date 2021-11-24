import { Context } from "aws-lambda";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import { StateInput } from "./validateCompletePortfolioDraft";
import { updatePortfolioDraftStatus } from "./persistPortfolioDraft";

/**
 * Updates the status of the Provisioning Portfolio Draft to 'failed'
 * at the end of being processed by the State Machine
 *
 * @param stateInput - the input from the previous Portfolio Draft Validation
 *  Task in the Step Function
 */
export async function handler(rejectedStateInput: StateInput, context?: Context): Promise<void> {
  const rejectedPortfolioDraft = rejectedStateInput;
  const portfolioDraftId = rejectedPortfolioDraft.body.id;
  console.log("SFN INPUT (rejected): " + JSON.stringify(rejectedStateInput));
  const databaseResult = await updatePortfolioDraftStatus(portfolioDraftId, ProvisioningStatus.FAILED);
  console.log("DB UPDATE RESULT (rejected): " + JSON.stringify(databaseResult));
}
