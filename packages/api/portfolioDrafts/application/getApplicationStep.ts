import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, NO_SUCH_APPLICATION_STEP, NO_SUCH_PORTFOLIO_DRAFT_400 } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape } from "../../utils/requestValidation";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { IpCheckerMiddleware } from "../../utils/ipLogging";

/**
 * Gets the Application Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<ApplicationStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<ApplicationStep>(event);
  const portfolioDraftId = event.pathParameters?.portfolioDraftId as string;

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
      return NO_SUCH_PORTFOLIO_DRAFT_400;
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

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
