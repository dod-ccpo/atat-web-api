import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbClient as client } from "../../utils/dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_EMPTY, REQUEST_BODY_INVALID } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { isApplicationStep, isValidJson } from "../../utils/validation";

/**
 * Submits the Application Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return REQUEST_BODY_EMPTY;
  }

  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }

  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);

  // remove this, and function?
  if (!isApplicationStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const now = new Date().toISOString();
  const applicationStep: ApplicationStep = requestBody;

  const command = new UpdateCommand({
    TableName: process.env.ATAT_TABLE_NAME ?? "",
    Key: {
      id: portfolioDraftId,
    },
    UpdateExpression: "set #portfolioVariable = :application, updated_at = :now",
    ExpressionAttributeNames: {
      "#portfolioVariable": APPLICATION_STEP,
    },
    ExpressionAttributeValues: {
      ":application": applicationStep,
      ":now": now,
    },
    ConditionExpression: "attribute_exists(created_at)",
  });

  try {
    await client.send(command);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<ApplicationStep>(applicationStep, SuccessStatusCode.CREATED);
}
