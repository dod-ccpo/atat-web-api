import "reflect-metadata";
import { createConnection } from "typeorm";
// import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { IEnvironment } from "../../../orm/entity/Environment";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyEventPathParameters, APIGatewayProxyResult, Context } from "aws-lambda";
import { DATABASE_ERROR } from "../../utils/errors";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import internalSchema = require("../../models/internalSchema.json");
import middy from "@middy/core";
import xssSanitizer from "../../portfolioDrafts/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { wrapSchema } from "../../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { isValidUuidV4 } from "../../utils/validation";
import createError from "http-errors";
import { IpCheckerMiddleware } from "../../utils/ipLogging";

/**
 * Submits the environment of an application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<IEnvironment>,
  context?: Context
): Promise<APIGatewayProxyResult> {
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
  const connection = await createConnection({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "atat_api_admin",
    password: "postgres",
    database: "atatnew",
    synchronize: false,
    logging: false,
    entities: ["../orm/entity/**/*.ts"],
    migrations: ["../orm/migration/**/*.js"],
    cli: {
      entitiesDir: "../orm/entity",
      migrationsDir: "../orm/migration",
    },
  });
  const insertedEnvironments: IEnvironment[] = [];

  try {
    // ensures both the portfolio and application exists
    const portfolio = await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    const application = await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });

    const insertResult = await connection
      .getCustomRepository(EnvironmentRepository)
      .createEnvironment([{ name: environmentName, application }]);

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
    }
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + JSON.stringify(error));
      return new OtherErrorResponse("Portfolio or Application is not found", ErrorStatusCode.NOT_FOUND);
    }
    console.error("Database error: " + JSON.stringify(error));
    return DATABASE_ERROR;
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Array<IEnvironment>>(insertedEnvironments, SuccessStatusCode.CREATED);
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
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(environmentSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
