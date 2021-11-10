import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep } from "../../models/FundingStep";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404, NO_SUCH_FUNDING_STEP } from "../../utils/errors";
import { validateRequestShape } from "../../utils/requestValidation";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
/**
 * Gets the Funding Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<FundingStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<FundingStep>(event);
  const portfolioDraftId = event.pathParameters?.portfolioDraftId as string;
  try {
    const result = await client.send(
      new GetCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        ProjectionExpression: FUNDING_STEP,
      })
    );
    if (!result.Item) {
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
    if (!result.Item?.funding_step) {
      return NO_SUCH_FUNDING_STEP;
    }
    return new ApiSuccessResponse<FundingStep>(result.Item.funding_step as FundingStep, SuccessStatusCode.OK);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
export const handler = middy(baseHandler)
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
