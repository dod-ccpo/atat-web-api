import "reflect-metadata";
import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { Environment, IEnvironment } from "../../../orm/entity/Environment";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyResult, Context } from "aws-lambda";
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
import { IpCheckerMiddleware } from "../../utils/ipLogging";
import { validateRequestShape } from "../../utils/shapeValidator";
import { uniqueNameValidator } from "../../utils/businessRulesValidation";

/**
 * Submits an update to an environment of an application
 *
 * @param event - The PUT request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<IEnvironment>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const setupResult = validateRequestShape<IEnvironment>(event);
  const { portfolioId, applicationId, environmentId } = setupResult.path;
  const requestBody = setupResult.bodyObject;

  // set up database connection
  const connection = await createConnection();
  let response: Environment;

  try {
    // ensures the portfolio, application, and environment id exists
    await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    const application = await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });
    const environment = await connection
      .getCustomRepository(EnvironmentRepository)
      .findOneOrFail({ id: environmentId });

    const environmentNames = await connection
      .getCustomRepository(EnvironmentRepository)
      .getAllEnvironmentNames(application.id);

    // Throws error if duplicate name found
    uniqueNameValidator(requestBody.name, environmentNames);

    response = await connection
      .getCustomRepository(EnvironmentRepository)
      .updateEnvironment(environment.id, requestBody);
    console.log("Updated Environment: " + JSON.stringify(response));
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Environment>(response, SuccessStatusCode.OK);
}

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(internalSchema.Environment) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
