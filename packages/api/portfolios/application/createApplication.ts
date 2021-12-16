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
// import { createConnection } from "typeorm";

import { Application, IApplicationCreate } from "../../../orm/entity/Application";
import { Portfolio } from "../../../orm/entity/Portfolio";
import { createConnection } from "../../utils/database";

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
  const thebody = event.body as Application;
  // set up database connection
  const connection = await createConnection();
  try {
    // Ensure portfolio exists
    const portfolioRepository = connection.getRepository(Portfolio);
    const portfolio = await portfolioRepository.findOneOrFail({ id: portfolioId });
    console.log(portfolio);
    console.log("The Portfolio should appear above this message");
    thebody.portfolio = portfolio;

    // Create a new application
    const newApp = await connection.getRepository(Application).save(thebody);
    console.log("Successfully created new application" + JSON.stringify(newApp));

    console.log("ID of just created App:" + JSON.stringify(newApp.id));

    // Formatting response (remove the portfolio)
    response = newApp as IApplicationCreate;
    if (response.portfolio) {
      delete response.portfolio;
      console.log("Deleted the portfolio form the");
    }
    console.log(JSON.stringify(response));

    /*
    // Don't need to do this query because .save returns the full object with relations
    response = await connection.getCustomRepository(ApplicationRepository).getApplication(newApp.id);

    console.log("Inserted new application " + JSON.stringify(response)); */
  } catch (error) {
    console.log(error);
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + error);
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<any>(response, SuccessStatusCode.CREATED);
}
// middy without validation
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(schema.Application) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
