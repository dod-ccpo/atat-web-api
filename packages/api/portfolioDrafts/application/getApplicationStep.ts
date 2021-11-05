import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, NO_SUCH_APPLICATION_STEP } from "../../utils/errors";
import {
  ApiSuccessResponse,
  ErrorStatusCode,
  OtherErrorResponse,
  SetupError,
  SuccessStatusCode,
} from "../../utils/response";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { shapeValidationForPostRequest } from "../../utils/requestValidation";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";

// Note that API spec calls for 400 and not 404
export const NO_SUCH_PORTFOLIO_DRAFT_FOUND = new OtherErrorResponse(
  "The given Portfolio Draft does not exist",
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Gets the Application Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<ApplicationStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const setupResult = shapeValidationForPostRequest<ApplicationStep>(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;

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
      return NO_SUCH_PORTFOLIO_DRAFT_FOUND;
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

export const handler = middy(baseHandler).use(cors(CORS_CONFIGURATION));
