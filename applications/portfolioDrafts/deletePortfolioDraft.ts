import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
// import { PortfolioSummary } from "./models/PortfolioSummary";
// import { ProvisioningStatus } from "./models/ProvisioningStatus";
import { dynamodbClient as client } from "./utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
// const PRIMARY_KEY = process.env.PRIMARY_KEY || "";

/**
 * Deletes a Portfolio Draft
 *
 * @param event - The DELETE request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: path parameter must contain 'portfolioDraftId', return 400	Bad Request if not present
  // show properties of the event
  console.log("event.path: " + JSON.stringify(event.path));
  console.log("event.pathParameters: " + JSON.stringify(event.pathParameters));

  if (event.body && !JSON.parse(event.body)) {
    console.log("Request body must be empty");
    return { statusCode: 400, body: "Request body must be empty" };
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: uuid(), // should always yield 404
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
