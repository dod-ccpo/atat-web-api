import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PortfolioDraftModel } from "../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR } from "../utils/errors";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../utils/response";
import { isPathParameterPresent } from "../utils/validation";

export const NO_PORTFOLIO_PATH_PARAM = new OtherErrorResponse(
  "PortfolioDraftId must be specified in the URL path.",
  ErrorStatusCode.BAD_REQUEST
);
export const NO_SUCH_PORTFOLIO = new OtherErrorResponse(
  "Portfolio Draft with the given ID does not exist",
  ErrorStatusCode.NOT_FOUND
);

/**
 * Gets a detailed view of a Portfolio Draft
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  // TODO: validate that we get a valid ATAT_TABLE_NAME env variable
  if (!isPathParameterPresent(portfolioDraftId)) {
    return NO_PORTFOLIO_PATH_PARAM;
  }

  try {
    const result = await client.send(
      new GetCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
      })
    );

    if (!result.Item) {
      return NO_SUCH_PORTFOLIO;
    }
    return new ApiSuccessResponse<PortfolioDraftModel>(result.Item as PortfolioDraftModel, SuccessStatusCode.OK);
  } catch (err) {
    console.log("Database error: " + err);
    return DATABASE_ERROR;
  }
}
