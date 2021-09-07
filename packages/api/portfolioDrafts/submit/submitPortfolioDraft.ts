import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { isBodyPresent, isPathParameterPresent } from "../../utils/validation";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_NOT_EMPTY } from "../../utils/errors";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { v4 as uuidv4 } from "uuid";
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
    return NO_SUCH_PORTFOLIO_DRAFT;
  }

  try {
    const result = await submitPortfolioDraftCommand(TABLE_NAME, portfolioDraftId);

    return new ApiSuccessResponse(result.Attributes as PortfolioDraft, SuccessStatusCode.ACCEPTED);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.log("Database error: " + error.name);
    return DATABASE_ERROR;
  }
}
export async function submitPortfolioDraftCommand(
  table: string,
  portfolioDraftId: string
): Promise<UpdateCommandOutput> {
  const dynamodb = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(dynamodb);
  const now = new Date().toISOString();
  const submitId = uuidv4();
  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: "set #submitId = :submitIdValue, updated_at = :now",
      ExpressionAttributeNames: {
        "#submitId": "submit_id",
      },
      ExpressionAttributeValues: {
        ":now": now,
        ":submitIdValue": submitId,
      },
      ConditionExpression: "attribute_exists(created_at)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
}
