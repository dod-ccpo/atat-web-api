import { DynamoDBClient, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiResult } from "../../lib/response";
import { Quote } from "../lib/quote";

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const CLIENT = new DynamoDBClient({});

function randomItem<T>(array: Array<T>): T {
  return array[Math.floor(Math.random() * array.length)];
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: This will no longer work when we have >1MB of data
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: "id",
  });

  try {
    const scanResult = await CLIENT.send(scanCommand);
    if (!scanResult.Count) {
      return new ApiResult(404, { errorCode: "NotFound", errorMessage: "No matching quotes could be found" });
    }
    const keys = scanResult.Items;
    const quoteIds = keys.map((item) => item.id.S);
    const chosenKey = randomItem(quoteIds);
    const queryCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        id: { S: chosenKey },
      },
    });
    const queryResult = (await CLIENT.send(queryCommand)).Item;
    const quote: Quote = {
      text: queryResult.text.S,
      from: queryResult.from.S,
    };
    return new ApiResult(200, { result: quote });
  } catch (err) {
    console.log(err);
    return new ApiResult(500, { errorCode: "DatabaseError", errorMessage: "Error when querying the database" });
  }
};
