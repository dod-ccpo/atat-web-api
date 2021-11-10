import { Context } from "aws-lambda";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { ValidatedPortfolioDraft } from "./validateCompletePortfolioDraft";
import { updatePortfolioDraftStatus } from "./persistPortfolioDraft";

const ATAT_TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";

/**
 * Updates the status of the Provisioning Portfolio Draft to 'failed'
 * at the end of being processed by the State Machine
 *
 * @param stateInput - the input from the previous Portfolio Draft Validation
 *  Task in the Step Function
 */
export async function handler(rejectedStateInput: ValidatedPortfolioDraft, context?: Context): Promise<void> {
  const rejectedPortfolioDraft = rejectedStateInput;
  const portfolioDraftId = rejectedPortfolioDraft.id;
  console.log("SFN INPUT (rejected): " + JSON.stringify(rejectedStateInput));
  const databaseResult = await updatePortfolioDraftStatus(ATAT_TABLE_NAME, portfolioDraftId, ProvisioningStatus.FAILED);
  console.log("DB UPDATE RESULT (rejected): " + JSON.stringify(databaseResult));
}
