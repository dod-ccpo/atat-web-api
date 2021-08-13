import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { PortfolioStep } from "../../models/PortfolioStep";

export const createPortfolioStepCommand = async (
  client: DynamoDBClient,
  table: string,
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
) => {
  const now = new Date().toISOString();
  const result = await client.send(
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
    })
  );
  return result;
};
