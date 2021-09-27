import { UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "../../utils/errors";
import { baseHandler } from "../../utils/handler";
import { ApiSuccessResponse, ErrorResponse, SuccessStatusCode } from "../../utils/response";
import { isValidJson, isValidUuidV4 } from "../../utils/validation";

class SetupError {
  public readonly errorResponse: ErrorResponse;
  constructor(errorResponse: ErrorResponse) {
    this.errorResponse = errorResponse;
  }
}

class SetupSuccess<T> {
  public readonly path: { [key: string]: string };
  public readonly bodyObject: T;
  constructor(path: { [key: string]: string }, bodyObject: T) {
    this.path = path;
    this.bodyObject = bodyObject;
  }
}

type SetupResult<T> = SetupError | SetupSuccess<T>;

export async function handler(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {
  return baseHandler(createPortfolioStep, event, context);
}

function preValidation(event: APIGatewayProxyEvent): SetupResult<PortfolioStep> {
  if (!isValidUuidV4(event.pathParameters?.portfolioDraftId)) {
    return new SetupError(NO_SUCH_PORTFOLIO_DRAFT);
  }
  const portfolioDraftId = event.pathParameters!.portfolioDraftId!;
  const bodyResult = isValidJson<PortfolioStep>(event.body);
  if (bodyResult === undefined) {
    return new SetupError(REQUEST_BODY_INVALID);
  }
  return new SetupSuccess<PortfolioStep>({ portfolioDraftId }, bodyResult);
}

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function createPortfolioStep(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const setupResult = preValidation(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;
  const portfolioStep = setupResult.bodyObject;

  try {
    await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
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
