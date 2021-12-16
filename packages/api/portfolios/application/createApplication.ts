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
import { validateRequestShape } from "../../utils/shapeValidator";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { wrapSchema } from "../../utils/schemaWrapper";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { createConnection } from "typeorm";
// import { Portfolio } from "../../../Portfolio";

import { Application, IApplication, IApplicationCreate, IApplicationUpdate } from "../../../orm/entity/Application";
// import { ApplicationRepository } from "../../repository/ApplicationRepository";
import { ProvisioningStatus } from "../../../orm/entity/ProvisionableEntity";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { ApplicationRepository } from "../../repository/ApplicationRepository";
import { EnvironmentRepository } from "../../repository/EnvironmentRepository";
import { IEnvironmentCreate } from "../../../orm/entity/Environment";

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

    // Create a new application

    const app1 = new Application();
    app1.name = event.body.name;
    app1.description = event.body.description;

    app1.environments = event.body.environments;
    const newResult = await connection.getRepository(Application).save(app1);
    console.log(newResult);
    console.log("app save result above");

    console.log("ID of just created App:");
    console.log(newResult.id);

    // ensure the portfolio exists
    const portfolioRepository = connection.getRepository(Portfolio);
    const portfolio = await portfolioRepository.findOneOrFail({ id: portfolioId });
    console.log(portfolio);
    console.log("The Portfolio should appear above this message");

    // The insert way
    /*
    const response = await connection
      .getCustomRepository(ApplicationRepository)
      .createApplication({ ...app2, portfolio });
    console.log("Below is the ID to delete");
    console.log(response.identifiers[0].id);
    console.log(response); */

    // Find the stuff we just created
    const application = await connection.getRepository(Application).findOneOrFail({ id: newResult.id });
    console.log("Heres the app we just created");
    console.log(application);

    /**
     *
     *
     *
     *
     *
     *
     */

    /*
    const applicationRepository = await connection.getRepository(Application).findOneOrFail({
      id: response.raw[0].id,
    }); */

    // Application
    /*
    app1.portfolio = portfolio as Portfolio;
    console.log(app1.environments);
    const appRepository = connection.getRepository(Application);
    response = await appRepository.save(app1); */
    /**
     *
     *
     *
     *
     *
     *
     */

    // Let's find our new application
    // const insertedApp = await connection.manager.find(Application);
    /*
    const insertedApp = await connection
      .getCustomRepository(ApplicationRepository)
      .getApplicationsByPortfolioId(portfolioId);
    console.log(insertedApp);
    console.log("All insertedApps above"); */
    /*
    console.log("Delete the app");
    const deleteApp = await connection
      .getCustomRepository(ApplicationRepository)
      .deleteApplication(response.identifiers[0].id);
*/
    // const application = await connection.getRepository(Application).findOneOrFail({ id: response.identifiers[0].id });
    /*
    const environmentBody = app2.environments as unknown as IEnvironmentCreate;
    const insertResult = await connection
      .getCustomRepository(EnvironmentRepository)
      .createEnvironment([{ ...environmentBody, application }]);

    console.log(insertResult);
    console.log("environment inserted above");
*/
    /**
     *
     *
     *
     *
     *
     *
     */
  } catch (error) {
    console.log(error);
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
  .use(validator({ inputSchema: wrapSchema(schema.Application) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
