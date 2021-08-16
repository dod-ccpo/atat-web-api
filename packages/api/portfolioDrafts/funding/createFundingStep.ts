import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../../models/Error";
import { FundingStep } from "../../models/FundingStep";
import { dynamodbClient as client } from "../../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { isFundingStep, isValidJson } from "../../utils/validation";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const NO_SUCH_PORTFOLIO_DRAFT = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);
const REQUEST_BODY_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "A valid FundingStep object must be provided" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Request body must not be empty" },
      ErrorStatusCode.BAD_REQUEST
    );
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
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error: " + error.name },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
  return new ApiSuccessResponse<FundingStep>(fundingStep, SuccessStatusCode.CREATED);
};
