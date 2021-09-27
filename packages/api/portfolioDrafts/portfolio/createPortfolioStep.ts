import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, SetupError, DatabaseError, DatabaseResult } from "../../utils/response";
import { postRequestPreValidation } from "../../utils/requestValidation";

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */

export async function handler(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {
  // Perform shape validation
  const setupResult = postRequestPreValidation<PortfolioStep>(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;
  const portfolioStep = setupResult.bodyObject;
  // Perform business validation
  /*
  const businessResult = businessValidation<PortfolioStep>(portfolioStep)
  if (businessResult instanceof SetupError) {
    return businessResult.errorResponse;
  }
  */
  // Make database call
  const databaseResult = await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
  if (databaseResult instanceof DatabaseError) {
    return databaseResult.errorResponse;
  }
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
}

export async function createPortfolioStepCommand(
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
): Promise<DatabaseResult> {
  const now = new Date().toISOString();
  try {
    return await client.send(
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
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return new DatabaseError(NO_SUCH_PORTFOLIO_DRAFT);
    }
    // 500 level error
    throw error;
  }
}
