import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  PATH_VARIABLE_REQUIRED_BUT_MISSING,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
} from "../../utils/errors";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { isApplicationStep, isValidJson } from "../../utils/validation";
import { ErrorCodes, ValidationError } from "../../models/Error";

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
    return PATH_VARIABLE_REQUIRED_BUT_MISSING;
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

  // NOTE This is absolutely not want we want to do long term but I am just trying to meet the ACs as simply as possible
  const error = validate(applicationStep);
  if (error) {
    return new ErrorResponse({ code: error.code, message: error.message }, ErrorStatusCode.BAD_REQUEST);
  }

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

function validate(applicationStep: ApplicationStep): ValidationError | null {
  // NOTE: this is a quick and dirty validation attempt that will likely be replaced by a full-featured solution in AT-6549
  // It will not provide an error map because of the complexity involved.
  if (applicationStep.name.length < 4 || applicationStep.name.length > 100) {
    return {
      code: ErrorCodes.INVALID_INPUT,
      message: "application name invalid",
    } as ValidationError;
  }
  if (!applicationStep.environments || applicationStep.environments?.length === 0) {
    return {
      code: ErrorCodes.INVALID_INPUT,
      message: "environments must be included",
    } as ValidationError;
  }
  for (const environment of applicationStep.environments) {
    if (environment.name.length < 4 || environment.name.length > 100) {
      return {
        code: ErrorCodes.INVALID_INPUT,
        message: "environment name invalid",
      } as ValidationError;
    }
  }

  return null;
}
