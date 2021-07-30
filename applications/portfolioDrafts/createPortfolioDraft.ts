import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
import { PortfolioSummary } from "./models/PortfolioSummary";
import { ProvisioningStatus } from "./models/ProvisioningStatus";
import { dynamodbClient as client } from "./utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
// const PRIMARY_KEY = process.env.PRIMARY_KEY || "";

/**
 * Creates a new Portfolio Draft
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.body && !JSON.parse(event.body)) {
    return { statusCode: 400, body: "Request body must be empty" };
  }

  const now = new Date().toISOString();
  const document: PortfolioSummary = {
    id: uuid(),
    created_at: now,
    updated_at: now,
    status: ProvisioningStatus.NotStarted,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: document,
  };

  const command = new PutCommand(params);

  try {
    const data = await client.send(command);
    console.log("success. created item: " + JSON.stringify(data));
    return { statusCode: 201, body: JSON.stringify(data) };
  } catch (err) {
    console.log("database error: " + err);
    return { statusCode: 500, body: "database error" };
  }
};
