import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FundingStep } from "../../models/FundingStep";
import { dynamodbClient as client } from "../../utils/dynamodb";
import {
  ApiSuccessResponse,
  SuccessStatusCode,
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
} from "../../utils/response";
import { isFundingStep, isValidJson } from "../../utils/validation";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

  if (!isFundingStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const now = new Date().toISOString();
  const fundingStep: FundingStep = requestBody;

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    UpdateExpression: "set #portfolioVariable = :portfolio, updated_at = :now",
    ExpressionAttributeNames: {
      "#portfolioVariable": "funding_step",
    },
    ExpressionAttributeValues: {
      ":portfolio": fundingStep,
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
  return new ApiSuccessResponse<FundingStep>(fundingStep, SuccessStatusCode.CREATED);
};
