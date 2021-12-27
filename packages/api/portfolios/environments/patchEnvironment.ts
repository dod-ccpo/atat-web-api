import "reflect-metadata";
import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { Environment, IEnvironmentOperators } from "../../../orm/entity/Environment";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape } from "../../utils/shapeValidator";
import middy from "@middy/core";
import internalSchema = require("../../models/internalSchema.json");
import { wrapSchema } from "../../utils/schemaWrapper";
import { IpCheckerMiddleware } from "../../utils/ipLogging";
import jsonBodyParser from "@middy/http-json-body-parser";
import xssSanitizer from "../../utils/xssSanitizer";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import cors from "@middy/http-cors";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";

/**
 * Submits a request to update the operators of an environment
 *
 * @param event - The PATCH request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<IEnvironmentOperators>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const setupResult = validateRequestShape<IEnvironmentOperators>(event);
  const { portfolioId, applicationId, environmentId } = setupResult.path;
  const requestBody = setupResult.bodyObject;

  // set up database connection
  const connection = await createConnection();
  const environmentRepository = connection.getCustomRepository(EnvironmentRepository);
  let response: Environment;

  try {
    // ensures the portfolio, application, and environment id exists
    await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });
    const environment = await environmentRepository.findOneOrFail({ id: environmentId });

    response = await environmentRepository.patchEnvironment(environment.id, requestBody);
    console.log("Patched Environment: " + JSON.stringify(response));
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Environment>(response, SuccessStatusCode.OK);
}

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(internalSchema.AppEnvAccess) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
