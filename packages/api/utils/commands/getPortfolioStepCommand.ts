import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodbClient as client } from "../../utils/dynamodb";

export const getPortfolioStepCommand = async (table: string, portfolioDraftId: string) => {
  const dynamodb = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(dynamodb);
  const result = await ddb.send(
    new GetCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      ProjectionExpression: "portfolio_step",
    })
  );
  return result;
};
