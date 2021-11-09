import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { Application } from "../../models/Application";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiSuccessResponse, SetupError, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import schema = require("../../models/schema.json");
import middy from "@middy/core";
import xssSanitizer from "../xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { findAdministrators, validateRequestShape } from "../../utils/requestValidation";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";

/**
 * Submits the Application Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<ApplicationStep>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const setupResult = validateRequestShape<ApplicationStep>(event);
  if (setupResult instanceof SetupError) {
    return setupResult.errorResponse;
  }
  const portfolioDraftId = setupResult.path.portfolioDraftId;
  const applicationStep = event.body;

  // TODO(AT-?): add new endpoint for Step 4 that includes this below business rule
  // This is only a quick fix and is reverting the admin operator role business
  // rule that was implemented in AT-6723. All other business rules are
  // are still covered by middy. This will allow the UI team to submit application
  // in Step 3.
  // const adminRoles = findAdministrators(applicationStep);
  // TODO(AT-6734): add uniform validation response for business rules
  // if (!adminRoles.acceptableAdministratorRoles) {
  //   return new ValidationErrorResponse(
  //     `Invalid admin roles. Acceptable admin rules are:
  //     - one portfolio admin role
  //     - at least one app admin role for each app when no portfolio admin role
  //     - at least one env admin role for each env when no app admin role one level up.`,
  //     { ...adminRoles }
  //   );
  // }

  try {
    await client.send(
      new UpdateCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        UpdateExpression: `set #portfolioVariable = :application, updated_at = :now,
        num_applications = :numOfApplications, num_environments = :numOfEnvironments`,
        ExpressionAttributeNames: {
          "#portfolioVariable": APPLICATION_STEP,
        },
        ExpressionAttributeValues: {
          ":application": applicationStep,
          ":now": new Date().toISOString(),
          ":numOfApplications": applicationStep.applications.length,
          ":numOfEnvironments": applicationStep.applications.flatMap((app: Application) => app.environments).length,
        },
        ConditionExpression: "attribute_exists(created_at)",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<ApplicationStep>(applicationStep, SuccessStatusCode.CREATED);
}
const applicationStepSchema = schema.ApplicationStep;

const wrappedApplicationStepSchema = {
  type: "object",
  required: ["body"],
  properties: {
    body: applicationStepSchema,
  },
};
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrappedApplicationStepSchema }))
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
