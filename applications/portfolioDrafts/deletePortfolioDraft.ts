import { DeleteCommand, DeleteCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamodbClient as client } from "./utils/dynamodb";
import { ErrorCodes } from "./models/Error";
import { ErrorResponse, ErrorStatusCode, NoContentResponse } from "./utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

/**
 * Deletes a Portfolio Draft
 *
 * @param event - The DELETE request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "PortfolioDraftId must be specified in the URL path" },
      ErrorStatusCode.BAD_REQUEST
    );
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
      return new ErrorResponse(
        { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
        ErrorStatusCode.NOT_FOUND
      );
    }
    return new NoContentResponse();
  } catch (err) {
    console.log("Database error: " + err);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
