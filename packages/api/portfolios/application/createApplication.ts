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
import { Portfolio } from "../../../Portfolio";
import "reflect-metadata";
import { Application } from "../../../orm/entity/Application";
import { ApplicationRepository } from "../../repository/ApplicationRepository";
import { ProvisioningStatus } from "../../../orm/entity/ProvisionableEntity";
import { CloudServiceProvider, DodComponent } from "../../../orm/entity/Portfolio";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<any>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  // const portfolioId = event.pathParameters?.portfolioId;
  // const portfolioId = "b148645b-7c71-4d05-af76-dc1f1505506a";
  // const application = event.body;
  // console.log(application);
  try {
    // Set up DB connection
    console.log("Establishing connection");
    const connection = await createConnection();
    //
    //
    // Set up portfolio
    //
    const pd = new Portfolio();
    pd.provisioningStatus = ProvisioningStatus.PENDING;
    pd.owner = "portfolio.owner@dod.mil";
    pd.name = "Cheetah portfolio";
    pd.description = "Description of portfolio";
    pd.csp = CloudServiceProvider.CSP_A;
    pd.dodComponents = [DodComponent.ARMY, DodComponent.NAVY];
    pd.portfolioManagers = ["jane.manager@dod.mil", "john.manager@dod.mil"];
    await connection.manager.save(pd);

    console.log("Saved a new portfolio with id: " + pd.id);
    const pfs = await connection.manager.find(Portfolio);
    console.log("Loaded portfolios: ", pfs);
    // Application

    const app1 = new Application();
    app1.name = event.body.name;
    app1.description = event.body.description;
    // For each environment, we need to create a new Environment
    // event.body.evironments is passed in as an array, we can pass it in and cascade it so we only save once..
    app1.environments = event.body.environments;
    const portfolio = await connection
      .getRepository(Portfolio)
      .findOneOrFail({ id: event.pathParameters?.portfolioId });
    app1.portfolio = portfolio as Portfolio;
    console.log(app1.environments);
    const appRepository = connection.getRepository(Application);
    await appRepository.save(app1);
    // Now we need to update portfolio to add the new application to it?

    // await connection.manager.save(app1);
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      console.log("Invalid parameter entered: " + error);
      return NO_SUCH_PORTFOLIO_DRAFT_404;
    }
  }

  /*
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
  */

  const theResponse = new ApiSuccessResponse<any>(response, SuccessStatusCode.CREATED);
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
