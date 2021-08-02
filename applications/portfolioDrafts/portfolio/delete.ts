import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { parse } from "uuid";
import { dynamodbClient as client } from "../utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
// const PRIMARY_KEY = process.env.PRIMARY_KEY || "";

/**
 * Deletes a Portfolio Draft
 *
 * @param event - The DELETE request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (portfolioDraftId == null) {
    return { statusCode: 400, body: "Bad Request. A Portfolio Draft ID must be specified in URL path." };
  }

  if (!parse(portfolioDraftId)) {
    return { statusCode: 400, body: "Bad Request. Portfolio Draft ID must be a UUID compliant with RFC 4122." };
  }

  if (event.body && !JSON.parse(event.body)) {
    return { statusCode: 400, body: "Bad Request. The Request body must be empty." };
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
  };

  const command = new DeleteCommand(params);

  // TODO: Implement statusCode 404: Portfiolio Draft with the given ID does not exist
  try {
    const data = await client.send(command);
    console.log("success. deleted item: " + JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.log("database error: " + err);
    return { statusCode: 500, body: "database error" };
  }
};
