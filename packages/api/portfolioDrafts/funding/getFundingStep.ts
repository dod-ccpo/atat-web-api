import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SetupError, SuccessStatusCode } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { FundingStep } from "../../models/FundingStep";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, NO_SUCH_FUNDING_STEP } from "../../utils/errors";
import { requestShapeValidation } from "../../utils/requestValidation";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
/**
 * Gets the Funding Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<FundingStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  // Perform shape validation
  const setupResult = requestShapeValidation<FundingStep>(event);
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
        ProjectionExpression: FUNDING_STEP,
      })
    );
    if (!result.Item) {
      return NO_SUCH_PORTFOLIO_DRAFT;
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
const handler = middy(baseHandler);
handler.use(JSONErrorHandlerMiddleware()).use(cors(CORS_CONFIGURATION));
export { handler };
