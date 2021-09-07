import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { isPathParameterPresent, isValidUuidV4 } from "../../utils/validation";
import { NO_SUCH_PORTFOLIO } from "./createPortfolioStep";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  NO_SUCH_PORTFOLIO_STEP,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
} from "../../utils/errors";

/**
 * Gets the Portfolio Step of the Portfolio Draft Wizard
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
        ProjectionExpression: PORTFOLIO_STEP,
      })
    );
    if (!result.Item) {
      return NO_SUCH_PORTFOLIO;
    }
    if (!result.Item?.portfolio_step) {
      return NO_SUCH_PORTFOLIO_STEP;
    }
    return new ApiSuccessResponse<PortfolioStep>(result.Item.portfolio_step as PortfolioStep, SuccessStatusCode.OK);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
