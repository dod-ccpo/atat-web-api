import "reflect-metadata";
import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { Environment, IEnvironmentCreate } from "../../../orm/entity/Environment";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyEventPathParameters, APIGatewayProxyResult, Context } from "aws-lambda";
import { DATABASE_ERROR, DUPLICATE_ENVIRONMENT_NAME, NO_SUCH_PORTFOLIO_OR_APPLICATION } from "../../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
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
  event: ApiGatewayEventParsed<IEnvironmentCreate>,
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
  const environmentBody = event.body as IEnvironmentCreate;

  const connection = await createConnection();
  const insertedEnvironments: IEnvironmentCreate[] = [];

  try {
    // ensures both the portfolio and application exists
    await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    const application = await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });

    // get all environment names for application
    const environments = await connection
      .getRepository(Environment)
      .createQueryBuilder("environment")
      .select(["environment.name"])
      .where("environment.applicationId = :applicationId", { applicationId: application.id })
      .getMany();

    // ensure the environment name is unique for the application
    // according to business rule 3.3
    for (const environment of environments) {
      if (environment.name === environmentBody.name) {
        throw createError(400, "Duplicate name");
      }
    }

    const insertResult = await connection
      .getCustomRepository(EnvironmentRepository)
      .createEnvironment([{ ...environmentBody, application }]);

    for (const environment of insertResult.identifiers) {
      // the result from the insert method does not have the name property
      // and an additional query after the insert is done to provide the correct shape
      // to be returned to the client. This assumes that only one environment will be
      // added at the moment but can be updated to handle more than one environment
      const queryInsertedEnvironment = await connection.getCustomRepository(EnvironmentRepository).findOneOrFail({
        select: [
          "name",
          "id",
          "createdAt",
          "updatedAt",
          "archivedAt",
          "administrators",
          "contributors",
          "readOnlyOperators",
        ],
        where: { id: environment.id },
      });

      insertedEnvironments.push(queryInsertedEnvironment);
      console.log("Inserted Environment: " + JSON.stringify(queryInsertedEnvironment));
    }
  } catch (error) {
    if (error.name === "EntityNotFoundError" || error.name === "EntityNotFoundError2") {
      console.log("Invalid parameter entered: " + JSON.stringify(error));
      return NO_SUCH_PORTFOLIO_OR_APPLICATION;
    }
    if (error.message === "Duplicate name") {
      return DUPLICATE_ENVIRONMENT_NAME;
    }
    console.error("Database error: " + JSON.stringify(error));
    return DATABASE_ERROR;
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Array<IEnvironmentCreate>>(insertedEnvironments, SuccessStatusCode.CREATED);
}

// temporary work around for providing validation shape that does not fail
// due to the 'allOf' and 'additionalProperties' conflict when composing schemas
// see https://json-schema.org/understanding-json-schema/reference/combining.html#properties-of-schema-composition
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
