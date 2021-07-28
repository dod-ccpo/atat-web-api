import { AttributeValue, DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PortfolioSummary } from "./models/PortfolioSummary";
import { ProvisioningStatus } from "./models/ProvisioningStatus";
import { v4 as uuid } from "uuid";

const TABLE_NAME = process.env.DYNAMODB_TABLE;
// const PRIMARY_KEY = process.env.PRIMARY_KEY || "";
const CLIENT = new DynamoDBClient({});

/**
 * Handles requests from the API Gateway.
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body?.trim()) {
    return { statusCode: 400, body: "Invalid request, you are missing the parameter body" };
  }
  // const item = typeof event.body === "object" ? event.body : JSON.parse(event.body);
  const now = Date.prototype.toISOString();
  const pf: PortfolioSummary = {
    id: uuid(),
    created_at: now,
    updated_at: now,
    status: ProvisioningStatus.NotStarted,
  };
  const item = pf;

  // item[PRIMARY_KEY] = uuid();
  console.log(item);
  /*
  try {
    JSON.parse(event.body);
  } catch (err) {
    return new ApiResult(400, missingQuote());
  }
*/
  // const body = JSON.parse(event.body);
  /*

  if (!isQuote(body)) {
    return new ApiResult(400, missingField(missingQuoteField(body)));
  }
  const newQuote: Quote = body as Quote;
  const quoteId = uuid();

  const pf: PortfolioSummary = {
    id: uuid(),
    created_at: now,
    updated_at: now,
    status: ProvisioningStatus.NotStarted,
  };
  */

  const putCommand = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: pf,
  });

  try {
    await CLIENT.send(putCommand);
  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: "database error" };
  }
  return { statusCode: 201, body: "good job" };
};
