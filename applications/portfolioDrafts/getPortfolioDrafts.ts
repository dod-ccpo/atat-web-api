import { GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamodbClient as client } from "./utils/dynamodb";
import { ErrorCodes } from "./models/Error";
import { ErrorResponse, ErrorStatusCode, NoContentResponse } from "./utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

/**
 * Gets all Portfolio Drafts
 * TODO: to which the user has read access
 *
 * @param event - The GET request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      id: "",
    },
  };

  const command = new GetCommand(params);

  try {
    const data = await client.send(command);
    return new NoContentResponse();
  } catch (err) {
    console.log("Database error: " + err);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
