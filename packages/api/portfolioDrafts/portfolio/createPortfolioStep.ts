import { UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { isValidJson, isValidUuidV4 } from "../../utils/validation";
import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID, DATABASE_ERROR } from "../../utils/errors";

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isValidUuidV4(portfolioDraftId!)) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }
  if (!isValidJson(event.body!)) {
    return REQUEST_BODY_INVALID;
  }
  const portfolioStep: PortfolioStep = JSON.parse(event.body!);

  try {
    await createPortfolioStepCommand(portfolioDraftId!, portfolioStep);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.log("Database error: " + error.name);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
}

export async function createPortfolioStepCommand(
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
): Promise<UpdateCommandOutput> {
  const now = new Date().toISOString();
  const result = await client.send(
    new UpdateCommand({
      TableName: process.env.ATAT_TABLE_NAME ?? "",
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: `set #portfolioVariable = :portfolio, updated_at = :now,
        #portfolioName = :portfolioName, num_portfolio_managers = :numOfManagers`,
      ExpressionAttributeNames: {
        "#portfolioVariable": PORTFOLIO_STEP,
        "#portfolioName": "name",
      },
      ExpressionAttributeValues: {
        ":portfolio": portfolioStep,
        ":now": now,
        ":portfolioName": portfolioStep.name,
        ":numOfManagers": portfolioStep.portfolio_managers.length,
      },
      ConditionExpression: "attribute_exists(created_at)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
}
