import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PortfolioStep } from ".././models/PortfolioStep";
import { dynamodbClient as client } from ".././utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const InvalidBody = { code: "INVALID_INPUT", message: "A valid request body must be specified" };
const DatabaseError = { code: "OTHER", message: "Internal database error" };

/**
 * Handles requests from the API Gateway.
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify(InvalidBody) };
  }

  const portfolioId = event.pathParameters?.portfolioDraftId;

  const requestBody = JSON.parse(event.body);
  const pf: PortfolioStep = {
    name: requestBody.name,
    description: requestBody.description,
    dod_components: requestBody.dod_components,
    portfolio_managers: requestBody.portfolio_managers,
  };

  const command = new UpdateCommand({
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
    await client.send(command);
  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: JSON.stringify(DatabaseError) };
  }
  return { statusCode: 201, body: JSON.stringify(pf) };
};
