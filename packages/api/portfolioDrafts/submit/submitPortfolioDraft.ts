import { UpdateCommand, UpdateCommandOutput, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { isBodyPresent, isPathParameterPresent } from "../../utils/validation";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  REQUEST_BODY_NOT_EMPTY,
  PORTFOLIO_ALREADY_SUBMITTED,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
} from "../../utils/errors";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { v4 as uuidv4 } from "uuid";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";

/**
 * Submits all progress from the Portfolio Provisioning Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (isBodyPresent(event.body)) {
    return REQUEST_BODY_NOT_EMPTY;
  }

  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_PARAMETER_REQUIRED_BUT_MISSING;
  }

  try {
    const result = await submitPortfolioDraftCommand(TABLE_NAME, portfolioDraftId);
    return new ApiSuccessResponse(result.Attributes as PortfolioDraft, SuccessStatusCode.ACCEPTED);
  } catch (error) {
    // Check if the portfolioDraft exists
    if (error.name === "ConditionalCheckFailedException") {
      const getResult = await doesPortfolioDraftExistCommand(TABLE_NAME, portfolioDraftId);
      if (!getResult.Item) {
        return NO_SUCH_PORTFOLIO_DRAFT;
      }
      return PORTFOLIO_ALREADY_SUBMITTED;
    }
    console.log("Database error: " + error);
    return DATABASE_ERROR;
  }
}
export async function submitPortfolioDraftCommand(
  table: string,
  portfolioDraftId: string
): Promise<UpdateCommandOutput> {
  const now = new Date().toISOString();
  const result = await client.send(
    new UpdateCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: "set #submitId = :submitIdValue, updated_at = :now, #status = :statusUpdate",
      ExpressionAttributeNames: {
        "#submitId": "submit_id",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":now": now,
        ":submitIdValue": uuidv4(),
        ":statusUpdate": ProvisioningStatus.IN_PROGRESS,
        ":currentStatus": ProvisioningStatus.NOT_STARTED,
      },
      ConditionExpression:
        "attribute_exists(created_at) AND attribute_not_exists(submit_id) AND #status = :currentStatus",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
}
// The `ConditionExpression` that we're using performs two different types of validation. The first is that
// the PortfolioDraft object actually exists in the database. If this condition fails, we need to return a 404.
// The second thing is that the portfolio has not been submitted. If this condition fails, we need to return a
// 400. Unfortunately, the DynamoDB ConditionalCheckFailedException error does not provide sufficient
// context to understand which of the two conditions failed, and so therefore we need to perform an
// additional GetItem request on the error path to determine which of these two scenarios has been hit.
export async function doesPortfolioDraftExistCommand(
  table: string,
  portfolioDraftId: string
): Promise<GetCommandOutput> {
  return client.send(
    new GetCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
    })
  );
}
