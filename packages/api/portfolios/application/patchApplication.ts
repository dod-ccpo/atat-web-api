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
import { Application, IApplicationCreate, IApplicationOperators } from "../../../orm/entity/Application";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { createConnection } from "typeorm";
import { ApplicationRepository } from "../../repository/ApplicationRepository";
import createError from "http-errors";
import { Environment } from "../../../orm/entity/Environment";
import { TaskOrder } from "../../../orm/entity/TaskOrder";
import { Clin } from "../../../orm/entity/Clin";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<IApplicationOperators>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<IApplicationOperators>(event);
  const portfolioId = event.pathParameters?.portfolioId as string;
  const applicationId = event.pathParameters?.applicationId as string;
  let response;
  // Establish databse connection
  // const connection = await createConnection();
  try {
    // Ensure portfolio exists
    // Local Database set up /////////////////////////////////////////////////////////////////////////////////////////////
    console.log("Establishing connection");
    const connection = await createConnection({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "postgres",
      password: "postgres",
      database: "atat",
      synchronize: false,
      logging: false,
      entities: [Portfolio, Application, Environment, TaskOrder, Clin],
      migrations: ["../orm/migration/**/*.js"],
      cli: {
        entitiesDir: "../../../orm/entity",
        migrationsDir: "../orm/migration",
      },
    });
    // const portfolioRepository = connection.getRepository(Portfolio);
    // const portfolio = await portfolioRepository.findOneOrFail({ id: portfolioId });

    response = await connection.getCustomRepository(ApplicationRepository).patchApplication(applicationId, event.body);
    console.log("Response:" + JSON.stringify(response));
    // Formatting response (remove the portfolio)
    /*
    response = newApp as IApplicationCreate;
    if (response.portfolio) {
      delete response.portfolio;
      console.log("Deleted the portfolio from application response");
    }
    console.log("Response:" + JSON.stringify(response));
    */
  } finally {
    // connection.close();
    console.log("done");
  }

  return new ApiSuccessResponse<IApplicationCreate>(response, SuccessStatusCode.CREATED);
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(schema.AppEnvAccess) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
