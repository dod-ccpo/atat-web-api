import "reflect-metadata";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
// import { Application } from "../../models/Application";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiSuccessResponse, OtherErrorResponse, SetupError, SuccessStatusCode } from "../../utils/response";
import schema = require("../../models/internalSchema.json");
import middy from "@middy/core";
import xssSanitizer from "../../utils/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape } from "../../utils/requestValidation";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { wrapSchema } from "../../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { Connection, createConnection, InsertResult } from "typeorm";
// import { Portfolio } from "../../../Portfolio";

import { Application } from "../../../orm/entity/Application";
// import { ApplicationRepository } from "../../repository/ApplicationRepository";
import { ProvisioningStatus } from "../../../orm/entity/ProvisionableEntity";
import { CloudServiceProvider, DodComponent, Portfolio } from "../../../orm/entity/Portfolio";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<any>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const portfolioId = event.pathParameters?.portfolioId;
  console.log(portfolioId);
  let response;
  try {
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
      entities: ["../orm/entity/**/*.ts"],
      migrations: ["../orm/migration/**/*.js"],
      cli: {
        entitiesDir: "../orm/entity",
        migrationsDir: "../orm/migration",
      },
    });
    console.log("Connected");
    console.log("Set up repository");
    /// ///////////////////////////////////////////////////////////////////////////////////////////////// Delete this when fn is done
    // Application
    // Create a new application
    const app1 = new Application();
    app1.name = event.body.name;
    app1.description = event.body.description;
    // For each environment, we need to create a new Environment
    // event.body.evironments is passed in as an array, we can pass it in and cascade it so we only save once..
    app1.environments = event.body.environments;
    const portfolioRepository = connection.getRepository(Portfolio);
    const portfolio = await portfolioRepository.findOneOrFail({ id: portfolioId });
    console.log(portfolio);
    console.log("The Portfolio should appear above this message");
    app1.portfolio = portfolio as Portfolio;
    console.log(app1.environments);
    const appRepository = connection.getRepository(Application);
    response = await appRepository.save(app1);
    // Now we need to update portfolio to add the new application to it?
    // Let's find our new application
    const insertedApp = await connection.manager.find(Application);
    console.log(insertedApp);
    console.log("All insertedApps above");

    // await connection.manager.save(app1);
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + error);
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
  }

  const theResponse = new ApiSuccessResponse<any>(response, SuccessStatusCode.CREATED);
  // console.log(theResponse);
  return theResponse;
}
// middy without validation
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
