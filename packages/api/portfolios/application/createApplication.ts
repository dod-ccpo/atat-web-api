import "reflect-metadata";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import schema = require("../../models/internalSchema.json");
import middy from "@middy/core";
import xssSanitizer from "../../utils/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape } from "../../utils/shapeValidator";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { wrapSchema } from "../../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { Application, IApplicationCreate } from "../../../orm/entity/Application";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { createConnection } from "../../utils/database";
import { ApplicationRepository } from "../../repository/ApplicationRepository";
import createError from "http-errors";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Application>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<Application>(event);
  const portfolioId = event.pathParameters?.portfolioId as string;
  let response;
  const applicationBody = event.body as Application;
  // Establish databse connection
  const connection = await createConnection();
  try {
    // Ensure portfolio exists
    const portfolioRepository = connection.getRepository(Portfolio);
    const portfolio = await portfolioRepository.findOneOrFail({ id: portfolioId });

    // Add the fetched portfolio to the applicationBody
    applicationBody.portfolio = portfolio;

    // Business rules validation
    // 3.1 unique applicaiton name
    // Search for all applications in the portfolio where the name matches the incoming name
    const existingApplications = await connection
      .getCustomRepository(ApplicationRepository)
      .getAllMatchingApplicationNames(portfolioId, applicationBody.name);
    console.log("existing applications below");
    console.log(existingApplications);

    // existing applications is either an empty array or contains a matching application.name
    // if it contains any matches, throw an error
    if (existingApplications.length > 0) {
      throw createError(400, "Duplicate application name in portfolio", {
        errorName: "DuplicateApplicationName",
        applicationName: applicationBody.name,
      });
    }

    // 3.3 unique environment name
    // if the incomming request has duplicate environment names, return an error
    const uniqueValues = new Set(applicationBody.environments.map((v) => v.name));
    if (uniqueValues.size < applicationBody.environments.length) {
      console.log("Duplicates found");
      throw createError(400, "Duplicate environment name in application", {
        errorName: "DuplicateEnvironmentName",
        environmentName: applicationBody.environments,
      });
    }

    // Create a new application
    const newApp = await connection.getRepository(Application).save(applicationBody);
    console.log("Successfully created new application" + JSON.stringify(newApp));
    console.log("ID of just created App:" + JSON.stringify(newApp.id));

    // Formatting response (remove the portfolio)
    response = newApp as IApplicationCreate;
    if (response.portfolio) {
      delete response.portfolio;
      console.log("Deleted the portfolio from application response");
    }
    console.log("Response:" + JSON.stringify(response));
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<IApplicationCreate>(response, SuccessStatusCode.CREATED);
}

// Bandaid fix for ajv validation with base object
// We cannot allow the user to send an id, createdAt, updatedAt, etc metadata fields in a query
// Since there is a problem with ajv validating read-only fields, we are redeclaring the specific schema
// WITHOUT those fields (id, createdAt, updatedAt, etc)
const app = schema.Application;
const appProps = app.properties;
const appEnv = app.allOf[1].properties;
const fixedAppSchema = {
  additionalProperties: app.additionalProperties,
  type: app.type,
  required: app.required,
  properties: {
    name: appProps.name,
    description: appProps.description,
    readOnlyOperators: appEnv.readOnlyOperators,
    administrators: appEnv.administrators,
    contributors: appEnv.contributors,
    environments: {
      type: appProps.environments.type,
      minItems: appProps.environments.minItems,
      items: {
        required: appProps.environments.items.required,
        type: appProps.environments.items.type,
        properties: {
          name: appProps.environments.items.properties.name,
          readOnlyOperators: appEnv.readOnlyOperators,
          administrators: appEnv.administrators,
          contributors: appEnv.contributors,
        },
        additionalProperties: appProps.environments.items.additionalProperties,
      },
    },
  },
};
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  // .use(validator({ inputSchema: wrapSchema(schema.Application) }))
  .use(validator({ inputSchema: wrapSchema(fixedAppSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
