import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
// import { Application } from "../../models/Application";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
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
import { Portfolio, Portfolio as PortfolioEntity } from "../../orm/entity/Portfolio";
import { ApplicationRepository } from "../../orm/repository/ApplicationRepository";
import { EnvironmentRepository } from "../../orm/repository/EnvironmentRepository";
import { Application } from "../../orm/entity/Application";
import { Environment } from "../../orm/entity/Environment";
import "reflect-metadata";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Application>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const portfolioId = event.pathParameters?.portfolioId;
  // const portfolioId = "b148645b-7c71-4d05-af76-dc1f1505506a";
  const application = event.body;
  console.log(application);

  // TODO rename these
  let response;
  let response2;
  const environments = event.body.environments;
  try {
    console.log("the environements");
    console.log(event.body.environments);
    // Set up DB connection
    console.log("Establishing connection");
    const connection = await createConnection();
    console.log("Connected");

    // Initialize custom repository for Application
    const theportfolio = await connection.getRepository(Portfolio).findOneOrFail({ id: portfolioId });
    const appRepository = connection.getCustomRepository(ApplicationRepository);
    response = await appRepository.createAndSaveApplication(theportfolio, application);
    // Now that the application is created, we must create environments attached to it....
    /*
    const envRepository = connection.getCustomRepository(EnvironmentRepository);
    response2 = await envRepository.createAndSaveEnvironment(response.id, environments);
    */
    console.log(response);
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + error);
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
    // TODO - catch with error handling middleware
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
  /*
  if (response instanceof OtherErrorResponse) {
    return response;
  } */

  const theResponse = new ApiSuccessResponse<Application>(response, SuccessStatusCode.CREATED);
  console.log(theResponse);
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
