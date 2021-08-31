import { GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FundingStep } from "../../models/FundingStep";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, NO_SUCH_FUNDING_STEP } from "../../utils/errors";

const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";

async function getFundingStepCommand(table: string, portfolioDraftId: string): Promise<GetCommandOutput> {
  const result = await client.send(
    new GetCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      ProjectionExpression: FUNDING_STEP,
    })
  );
  return result;
}

/**
 * Gets the Funding Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }

  try {
    const data = await getFundingStepCommand(TABLE_NAME, portfolioDraftId);
    if (!data.Item) {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    if (!data.Item?.funding_step) {
      return NO_SUCH_FUNDING_STEP;
    }
    return new ApiSuccessResponse<FundingStep>(data.Item.funding_step as FundingStep, SuccessStatusCode.OK);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
