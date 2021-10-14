import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, NO_SUCH_APPLICATION_STEP, PATH_PARAMETER_REQUIRED_BUT_MISSING } from "../../utils/errors";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { isPathParameterPresent, isValidUuidV4 } from "../../utils/validation";

// Note that API spec calls for 400 and not 404
export const NO_SUCH_PORTFOLIO_DRAFT = new OtherErrorResponse(
  "The given Portfolio Draft does not exist",
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Gets the Application Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_PARAMETER_REQUIRED_BUT_MISSING;
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
