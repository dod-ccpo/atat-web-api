import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
import { PortfolioSummary } from ".././models/PortfolioSummary";
import { ProvisioningStatus } from ".././models/ProvisioningStatus";
import { dynamodbClient } from ".././utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
// const PRIMARY_KEY = process.env.PRIMARY_KEY || "";
// TODO: Just use "dynamoDbClient"
const CLIENT = dynamodbClient;

/**
 * Handles requests from the API Gateway.
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.body && !JSON.parse(event.body)) {
    return { statusCode: 400, body: "Request body must be empty" };
  }
  const now = new Date().toISOString();
  const pf: PortfolioSummary = {
    id: uuid(),
    created_at: now,
    updated_at: now,
    status: ProvisioningStatus.NotStarted,
  };

  console.log(pf);

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: pf,
  });

  try {
    await CLIENT.send(putCommand);
  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: "database error" };
  }
  return { statusCode: 201, body: JSON.stringify(pf) };
};
