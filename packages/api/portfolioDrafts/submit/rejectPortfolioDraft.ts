import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { DynamoDBException, DatabaseResult } from "../../utils/response";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { ValidatedPortfolioDraft } from "./validateCompletePortfolioDraft";
import { updatePortfolioDraftStatus } from "./persistPortfolioDraft";

const TABLE_NAME = process.env.TABLE_NAME ?? "";

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
  const databaseResult = await updatePortfolioDraftStatus(TABLE_NAME, portfolioDraftId, ProvisioningStatus.FAILED);
  console.log("DB UPDATE RESULT (rejected): " + JSON.stringify(databaseResult));
}
