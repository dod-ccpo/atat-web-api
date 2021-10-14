import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { PortfolioDraftSummary } from "../models/PortfolioDraftSummary";
import { ProvisioningStatus } from "../models/ProvisioningStatus";
import { dynamodbDocumentClient as client } from "../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, REQUEST_BODY_NOT_EMPTY } from "../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../utils/response";

/**
 * Creates a new Portfolio Draft
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.body && !JSON.parse(event.body)) {
    return REQUEST_BODY_NOT_EMPTY;
  }

  const now = new Date().toISOString();
  const item: PortfolioDraftSummary = {
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    name: "",
    description: "",
    num_portfolio_managers: 0,
    num_task_orders: 0,
    num_applications: 0,
    num_environments: 0,
    status: ProvisioningStatus.NOT_STARTED,
  };

  try {
    await client.send(
      new PutCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Item: item,
      })
    );
    return new ApiSuccessResponse<PortfolioDraftSummary>(item, SuccessStatusCode.CREATED);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
