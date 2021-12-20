import "reflect-metadata";
import { createConnection } from "../../utils/database";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { Application } from "../../../orm/entity/Application";
import { Environment } from "../../../orm/entity/Environment";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import middy from "@middy/core";
import xssSanitizer from "../../utils/xssSanitizer";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { IpCheckerMiddleware } from "../../utils/ipLogging";
import { validateRequestShape } from "../../utils/shapeValidator";

/**
 * A submit that requests the environments of an application
 *
 * @param event - The GET request from API Gateway
 */
export async function baseHandler(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {
  const setupResult = validateRequestShape(event);
  const { portfolioId, applicationId } = setupResult.path;

  // set up database connection
  const connection = await createConnection();
  let response: Array<Environment>;

  try {
    // ensures both the portfolio and application exists
    await connection.getRepository(Portfolio).findOneOrFail({
      id: portfolioId,
    });
    const application = await connection.getRepository(Application).findOneOrFail({
      id: applicationId,
    });

    response = await connection
      .getCustomRepository(EnvironmentRepository)
      .getEnvironmentsByApplicationId(application.id);
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Array<Environment>>(response, SuccessStatusCode.OK);
}

export const handler = middy(baseHandler)
  .use(IpCheckerMiddleware())
  .use(xssSanitizer())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
