import { UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { isBodyPresent, isPathParameterPresent, isPortfolioStep, isValidJson } from "../../utils/validation";

export const NO_SUCH_PORTFOLIO = new OtherErrorResponse(
  "Portfolio Draft with the given ID does not exist",
  ErrorStatusCode.NOT_FOUND
);
export const REQUEST_BODY_INVALID = new OtherErrorResponse(
  "A valid PortfolioStep object must be provided",
  ErrorStatusCode.BAD_REQUEST
);
export const EMPTY_REQUEST_BODY = new OtherErrorResponse("Request body must not be empty", ErrorStatusCode.BAD_REQUEST);

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!isBodyPresent(event.body)) {
    return EMPTY_REQUEST_BODY;
  }

  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!isPathParameterPresent(portfolioDraftId)) {
    return NO_SUCH_PORTFOLIO;
  }

  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);

  if (!isPortfolioStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const portfolioStep: PortfolioStep = requestBody;

  try {
    await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO;
    }
    console.log("Database error: " + error.name);
    return new OtherErrorResponse("Database error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
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
