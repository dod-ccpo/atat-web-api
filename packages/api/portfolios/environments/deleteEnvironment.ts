import "reflect-metadata";
import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { NoContentResponse } from "../../utils/response";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { validateRequestShape } from "../../utils/shapeValidator";
import { IpCheckerMiddleware } from "../../utils/ipLogging";

/**
 * Submits a request to delete the environment of an application
 *
 * @param event - The DELETE request from API Gateway
 */
export async function baseHandler(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {
  const setupResult = validateRequestShape(event);
  const { portfolioId, applicationId, environmentId } = setupResult.path;

  // set up database connection
  const connection = await createConnection();

  try {
    // ensures the portfolio, application, and environment exists
    await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });
    await connection.getCustomRepository(EnvironmentRepository).deleteEnvironment(environmentId);
  } finally {
    connection.close();
  }

  return new NoContentResponse();
}

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(jsonBodyParser())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
