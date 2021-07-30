import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
import { PortfolioSummary } from ".././models/PortfolioSummary";
import { ProvisioningStatus } from ".././models/ProvisioningStatus";
import { PortfolioStep } from ".././models/PortfolioStep";
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
  if (!event.body) {
    return { statusCode: 400, body: "" };
  }

  const portfolioId = event.pathParameters?.portfolioDraftId;

  if (!portfolioId) {
    return { statusCode: 400, body: "invalid request, you are missing the path parameter id:" };
  }

  const requestBody = JSON.parse(event.body);
  const pf: PortfolioStep = {
    name: requestBody.name,
    description: requestBody.description,
    dod_components: requestBody.dod_components,
    portfolio_managers: requestBody.portfolio_managers,
  };

  const now = new Date().toISOString();

  console.log(pf);
  const updateCommand = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioId,
    },
    UpdateExpression: "set #portfolioVariable = :x",
    ExpressionAttributeNames: {
      "#portfolioVariable": "portfolioStep",
    },
    ExpressionAttributeValues: {
      ":x": pf,
    },
  });

  try {
    await CLIENT.send(updateCommand);
  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: "database error" };
  }
  return { statusCode: 201, body: JSON.stringify(pf) };
};
