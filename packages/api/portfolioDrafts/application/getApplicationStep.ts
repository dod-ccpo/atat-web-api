import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { ApplicationStep } from "../../models/ApplicationStep";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { isPathParameterPresent, isValidUuidV4 } from "../../utils/validation";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  NO_SUCH_APPLICATION_STEP,
  PATH_VARIABLE_REQUIRED_BUT_MISSING,
} from "../../utils/errors";

/**
 * Gets the Application Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_VARIABLE_REQUIRED_BUT_MISSING;
  }
  if (!isValidUuidV4(portfolioDraftId)) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }
  try {
    const result = await client.send(
      new GetCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        ProjectionExpression: APPLICATION_STEP,
      })
    );
    if (!result.Item) {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    if (!result.Item?.application_step) {
      return NO_SUCH_APPLICATION_STEP;
    }
    return new ApiSuccessResponse<ApplicationStep>(
      result.Item.application_step as ApplicationStep,
      SuccessStatusCode.OK
    );
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
