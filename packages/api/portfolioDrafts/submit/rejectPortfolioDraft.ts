import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { DynamoDBException, DatabaseResult } from "../../utils/response";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { ValidatedPortfolioDraft } from "./validateCompletePortfolioDraft";

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
  const databaseResult = await updatePortfolioDraftStatus(TABLE_NAME, portfolioDraftId);
  console.log("DB UPDATE RESULT (rejected): " + JSON.stringify(databaseResult));
}

export async function updatePortfolioDraftStatus(tableName: string, portfolioDraftId: string): Promise<DatabaseResult> {
  const now = new Date().toISOString();
  try {
    return await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          id: portfolioDraftId,
        },
        UpdateExpression: `set #status = :statusUpdate, updated_at = :now`,
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":now": now,
          ":statusUpdate": ProvisioningStatus.FAILED,
          ":expectedStatus": ProvisioningStatus.IN_PROGRESS,
        },
        ConditionExpression:
          "attribute_exists(created_at) AND attribute_exists(submit_id) AND #status = :expectedStatus",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return new DynamoDBException(NO_SUCH_PORTFOLIO_DRAFT_404);
    }
    // 5xx error logging
    console.log(error);
    throw error;
  }
}
