import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FundingStep } from "../../models/FundingStep";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_EMPTY, REQUEST_BODY_INVALID } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { isFundingStep, isValidJson, isValidDate } from "../../utils/validation";
import { ErrorCodes } from "../../models/Error";

const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";

/**
 * Submits the Funding Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return REQUEST_BODY_EMPTY;
  }

  // 1 b. The route must accept a {portfolioDraftId} that corresponds to a portfolio. This allows data for a specific portfolio draft’s funding to be stored
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  // 3. When an invalid {portfolioDraftId} is provided, a 404 code is provided, along with the message “Portfolio Draft with the given ID does not exist”
  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }

  // 1 c. The request body must be valid JSON
  if (!isValidJson(event.body)) {
    return REQUEST_BODY_INVALID;
  }
  const requestBody = JSON.parse(event.body);

  // 2. When a valid {portfolioDraftId} is provided, and the data in the request body is invalid, a 400 code is provided, along with the message “Invalid input“
  if (!isFundingStep(requestBody)) {
    return REQUEST_BODY_INVALID;
  }
  const fundingStep: FundingStep = requestBody;

  // TODO:
  // 1 d. Input validation must take place
  //   v. CLIN value and obligated funds must be numbers
  //   vi. CLIN value and obligated funds should be formatted as currency (i.e. “0.00”)

  // 2 b. An error map must be returned

  const clins = fundingStep.clins.values();
  // All validation tests below are logically negating the expected state; i.e. if (!expected) { return validation error }
  // Assertion messages are positive and describe the expected state.
  for (const clin of clins) {
    console.debug("Processing clin_number: " + clin.clin_number + "...");
    // 1 d. i. Any dates must be ISO 8601 compliant
    if (!isValidDate(clin.pop_start_date)) {
      console.warn("clin [" + clin.clin_number + "] - PoP start date must be a valid date");
      return createValidationErrorResponse({ pop_start_date: clin.pop_start_date });
    }
    if (!isValidDate(clin.pop_end_date)) {
      console.warn("clin [" + clin.clin_number + "] - PoP end date must be a valid date");
      return createValidationErrorResponse({ pop_end_date: clin.pop_end_date });
    }
    // 1 d. ii. PoP start date must occur before the PoP end date, and PoP end date cannot be in the past
    if (!(new Date(clin.pop_start_date) < new Date(clin.pop_end_date))) {
      console.warn("clin [" + clin.clin_number + "] - PoP start date must be before PoP end date");
      return createValidationErrorResponse({ pop_start_date: clin.pop_start_date, pop_end_date: clin.pop_end_date });
    }
    if (!(new Date() < new Date(clin.pop_end_date))) {
      console.warn("clin [" + clin.clin_number + "] - PoP end date must be in the future");
      return createValidationErrorResponse({ pop_end_date: clin.pop_end_date });
    }
    // 1 d. iii. Obligated funds must be greater than $0.00, and less than the total CLIN value
    if (!(clin.obligated_funds > 0)) {
      console.warn("clin [" + clin.clin_number + "] - Obligated funds must be greater than $0.00");
      return createValidationErrorResponse({ obligated_funds: clin.obligated_funds });
    }
    if (!(clin.obligated_funds < clin.total_clin_value)) {
      console.warn("clin [" + clin.clin_number + "] - Obligated funds must be less than the total CLIN value");
      return createValidationErrorResponse({ obligated_funds: clin.obligated_funds });
    }
    // 1 d. iv. Total CLIN value must be greater than $0.00
    if (!(clin.total_clin_value > 0)) {
      console.warn("clin [" + clin.clin_number + "] - Total CLIN value must be greater than $0.00");
      return createValidationErrorResponse({ total_clin_value: clin.total_clin_value });
    }
  }

  try {
    await createFundingStepCommand(TABLE_NAME, portfolioDraftId, fundingStep);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<FundingStep>(fundingStep, SuccessStatusCode.CREATED);
}

/**
 * Returns an error map using the given Record
 * @param properties contains property names and value that have failed validation
 * @returns ValidationErrorResponse containing an error map property with the given values
 */
export function createValidationErrorResponse(properties: Record<string, unknown>): ValidationErrorResponse {
  return new ValidationErrorResponse({
    errorMap: properties,
    code: ErrorCodes.INVALID_INPUT,
    message: "Invalid input",
  });
}

/**
 * Creates a DynamoDB Update command object using the given input, executes it, and returns the promised output.
 * @param table DynamoDB table name
 * @param portfolioDraftId uuid identifier for a Portfolio Draft
 * @param fundingStep an object that looks like a Funding Step
 * @returns output from the Update command
 */
export async function createFundingStepCommand(
  table: string,
  portfolioDraftId: string,
  fundingStep: FundingStep
): Promise<UpdateCommandOutput> {
  const dynamodb = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(dynamodb);
  const now = new Date().toISOString();
  const result = await ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      UpdateExpression: "set #var = :funding, updated_at = :now",
      ExpressionAttributeNames: {
        "#var": "funding_step",
      },
      ExpressionAttributeValues: {
        ":funding": fundingStep,
        ":now": now,
      },
      ConditionExpression: "attribute_exists(created_at)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result;
}
