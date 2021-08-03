import { DeleteCommand, DeleteCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamodbClient as client } from "../utils/dynamodb";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const InvalidBody = { code: "INVALID_INPUT", message: "HTTP request body must be empty" };
const MissingPortfolioDraftId = {
  code: "INVALID_INPUT",
  message: "PortfolioDraftId must be specified in the URL path",
};
const DoesNotExist = { code: "INVALID_INPUT", message: "Portfolio Draft with the given ID does not exist" };
const DatabaseError = { code: "OTHER", message: "Internal database error" };

/**
 * Deletes a Portfolio Draft
 *
 * @param event - The DELETE request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return { statusCode: 400, body: JSON.stringify(MissingPortfolioDraftId) };
  }

  if (event.body) {
    return { statusCode: 400, body: JSON.stringify(InvalidBody) };
  }

  const params: DeleteCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    ReturnValues: "ALL_OLD",
  };

  const command = new DeleteCommand(params);

  try {
    const data = await client.send(command);
    if (!data.Attributes) {
      return { statusCode: 404, body: JSON.stringify(DoesNotExist) };
    }
    return { statusCode: 200, body: "Successfully deleted portfolioDraft" };
  } catch (err) {
    console.log("Database Error: " + err);
    return { statusCode: 500, body: JSON.stringify(DatabaseError) };
  }
};
