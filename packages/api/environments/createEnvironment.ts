import "reflect-metadata";
import { createConnection } from "typeorm";
// import { createConnection } from "../utils/database";
import { Portfolio as PortfolioEntity } from "../orm/entity/Portfolio";
import { Application as ApplicationEntity } from "../orm/entity/Application";
import { Environment } from "../orm/entity/Environment";
import { APIGatewayProxyEventPathParameters, APIGatewayProxyResult, Context } from "aws-lambda";
import { DATABASE_ERROR, NO_SUCH_APPLICATION } from "../utils/errors";
import { ApiSuccessResponse, SetupError, SuccessStatusCode } from "../utils/response";
import internalSchema = require("../models/internalSchema.json");
import middy from "@middy/core";
import xssSanitizer from "../portfolioDrafts/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../utils/eventHandlingTool";
import { validateRequestShape } from "../utils/requestValidation";
import { CORS_CONFIGURATION } from "../utils/corsConfig";
import { wrapSchema } from "../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../utils/errorHandlingMiddleware";
import { EnvironmentRepository } from "../orm/repository/EnvironmentRepository";
import { isValidUuidV4 } from "../utils/validation";
import createError from "http-errors";

/**
 * Submits the environment of an application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Environment>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  // const setupResult = validateRequestShape<Environment>(event);
  // if (setupResult instanceof SetupError) {
  //   return setupResult.errorResponse;
  // }
  // const portfolioId = setupResult.path?.portfolioId;
  // const applicationId = setupResult.path?.applicationId;
  // const environmentName = setupResult.bodyObject.name;

  // validateRequestShape potential refactor to accommodate different pathParameters
  const parameters = Object.entries(event.pathParameters as APIGatewayProxyEventPathParameters);
  if (
    !parameters.every(
      ([param, paramValue]) => ["portfolioId", "applicationId"].includes(param) && isValidUuidV4(paramValue)
    )
  ) {
    throw createError(404, "Shape validation failed, invalid UUIDv4");
  }
  const portfolioId = event.pathParameters!.portfolioId;
  const applicationId = event.pathParameters!.applicationId;

  if (event.body === undefined) {
    throw createError(400, "Shape validation failed, invalid request body");
  }
  const environmentName = event.body.name;

  // currently using a regular connect for local development
  // TODO: update to utils/database/createConnection when testing in a deployed stack
  const connection = await createConnection();
  let response;

  try {
    // ensures that both the portfolio and application exists
    const portfolio = await connection.getRepository(PortfolioEntity).findOneOrFail({
      where: { id: portfolioId },
    });
    const application = await connection.getRepository(ApplicationEntity).findOneOrFail({
      where: { id: applicationId },
    });

    const insertResult = await connection
      .getCustomRepository(EnvironmentRepository)
      .createEnvironment([{ name: environmentName, application }]);

    // do we want to allow for the for the addition of multiple environments (bulk)?
    const insertedEnvironments: Environment[] = [];
    for (const environment of insertResult.identifiers) {
      // the result from the insert method does not have the name property
      // and an additional query after the insert is done to provide the correct shape
      // to be returned to the client. This assumes that only one environment will be
      // added at the moment but can be updated to handle more than one environment
      const queryInsertedEnvironment = await connection.getCustomRepository(EnvironmentRepository).findOneOrFail({
        select: ["name", "id", "createdAt", "updatedAt", "archivedAt"],
        where: { id: environment.id },
      });

      insertedEnvironments.push(queryInsertedEnvironment);
      console.log("Inserted Environment: " + JSON.stringify(queryInsertedEnvironment));
      response = queryInsertedEnvironment;
    }
    response = new ApiSuccessResponse<Environment>(response as Environment, SuccessStatusCode.CREATED);
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + error);
      return NO_SUCH_APPLICATION;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  } finally {
    connection.close();
  }
  // only the last inserted environment is in the response
  // alternatively the response can be insertedEnvironments with all inserted environments
  // return new ApiSuccessResponse<Environment>(response as Environment, SuccessStatusCode.CREATED);
  return response;
}

// an alternative to removing additionalProperties from BaseObject
const environmentSchema = {
  description: internalSchema.Environment.description,
  type: internalSchema.Environment.type,
  additionalProperties: internalSchema.Environment.additionalProperties,
  required: internalSchema.Environment.required,
  properties: {
    ...internalSchema.Environment.properties,
    ...internalSchema.Environment.allOf[0].properties,
    ...internalSchema.Environment.allOf[1].properties,
  },
};

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  // .use(validator({ inputSchema: wrapSchema(environmentSchema) }))
  .use(validator({ inputSchema: wrapSchema(internalSchema.Environment) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
