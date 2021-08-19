import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FundingStep } from "../../models/FundingStep";
import { FUNDING_STEP } from "../../models/PortfolioDraft";
import { dynamodbClient as client } from "../../utils/dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_EMPTY, REQUEST_BODY_INVALID } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { isFundingStep, isValidJson } from "../../utils/validation";
import { ErrorCodes, ValidationError } from "../../models/Error";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;

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
  const now = new Date().toISOString();
  const fundingStep: FundingStep = requestBody;

  // TODO:
  // 1 d. Input validation must take place
  //   i. Any dates must be ISO 8601 compliant
  //   ii. PoP start date must occur before the PoP end date, and PoP end date cannot be in the past
  //   iii. Obligated funds must be greater than $0.00, and less than the total CLIN value
  //   iv. Total CLIN value must be greater than $0.00
  //   v. CLIN value and obligated funds must be numbers
  //   vi. CLIN value and obligated funds should be formatted as currency (i.e. “0.00”)

  // 2 b. An error map must be returned, including input validation checks
  //   i. All data should be returned, including a parameter signaling invalid input, so the front-end can highlight the invalid field

  // BEGIN ValidationErrorResponse example
  const veresponse = new ValidationErrorResponse({
    errorMap: { propertyA: "", propertyB: "" },
    code: ErrorCodes.INVALID_INPUT,
    message: "Invalid input",
  });
  // END

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    UpdateExpression: "set #portfolioVariable = :portfolio, updated_at = :now",
    ExpressionAttributeNames: {
      "#portfolioVariable": FUNDING_STEP,
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
}
