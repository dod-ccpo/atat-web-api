import { DeleteCommand, DeleteCommandInput } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamodbClient as client } from "../utils/aws-sdk/dynamodb";
import { IpCheckerMiddleware } from "../utils/ipLogging";
import { ErrorStatusCode, NoContentResponse, OtherErrorResponse } from "../utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

/**
 * Deletes a Portfolio Draft
 *
 * @param event - The DELETE request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return new OtherErrorResponse("PortfolioDraftId must be specified in the URL path", ErrorStatusCode.BAD_REQUEST);
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
      return new OtherErrorResponse("Portfolio Draft with the given ID does not exist", ErrorStatusCode.NOT_FOUND);
    }
    return new NoContentResponse();
  } catch (err) {
    console.log("Database error: " + err);
    return new OtherErrorResponse("Database error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
  }
}

// IP logging middy
const middyHandler = middy(handler);
middyHandler.use(IpCheckerMiddleware());
export { middyHandler };
