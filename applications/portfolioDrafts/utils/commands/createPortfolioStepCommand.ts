import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, UpdateCommandOutput, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbClient as client } from "../../utils/dynamodb";

export const createPortfolioStepCommand = async (
  table: string,
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
) => {
  const dynamodb = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(dynamodb);
  const now = new Date().toISOString();
  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: "set #portfolioVariable = :portfolio, updated_at = :now",
      ExpressionAttributeNames: {
        "#portfolioVariable": "portfolio_step",
      },
      ExpressionAttributeValues: {
        ":portfolio": portfolioStep,
        ":now": now,
      },
      ConditionExpression: "attribute_exists(created_at)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
};
