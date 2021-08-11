import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PortfolioStep } from "../models/PortfolioStep";

export function portfolioStepCommand(
  table: string | undefined,
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
): UpdateCommand {
  const now = new Date().toISOString();
  const command = new UpdateCommand({
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
  });

  return command;
}
