import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { Application } from "../../models/Application";
import { ApplicationStep } from "../../models/ApplicationStep";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { dynamodbDocumentClient as client } from "../../utils/aws-sdk/dynamodb";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiSuccessResponse, SetupError, SuccessStatusCode } from "../../utils/response";
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
import { Portfolio as PortfolioEntity } from "../../orm/entity/Portfolio";
import { ApplicationRepository } from "../../orm/repository/ApplicationRepository";
import "reflect-metadata";

/**
 * Create an Application
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<any>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const portfolioId = event.pathParameters?.portfolioDraftId;
  // const portfolioId = "6558c17d-5ebe-4dc3-a15a-3c3b0dd7b0d2";
  const applicationStep = event.body;
  try {
    // Set up DB connection locally
    console.log("Establishing connection");
    const connection = await createConnection();
    console.log("Connected");
    const appRepository = connection.getCustomRepository(ApplicationRepository);
    // TODO - monday, pass Application as full object after updating Application Model
    // await appRepository.createAndSaveApplication(portfolioId, applicationStep);

    await appRepository.createAndSave(portfolioId!, "my name", "my description");

    // Find portfolio based on given UUID
    // If it exists -> create new application
    // If it doesn't exist -> return an error to user
  } catch (error) {
    // TODO - catch with error handling middleware
    console.log(error);
  }

  return new ApiSuccessResponse<any>(applicationStep, SuccessStatusCode.CREATED);
}
// middy without validation
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
/*
export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(schema.Application) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
*/
/*
Application:
      required:
        - environments
        - name
      type: object
      allOf:
        - $ref: "#/components/schemas/BaseObject"
        - $ref: '#/components/schemas/AppEnvAccess'
      properties:
        environments:
          minItems: 1
          type: array
          items:
            $ref: "#/components/schemas/Environment"
        name:
          pattern: "^[a-zA-Z\\d _-]{4,100}$"
          type: string
        description:
          pattern: "^[\\w\\d !@#$%^&*_|:;,'.-]{0,300}$"
          type: string
      additionalProperties: false
      description: "Represents an Application in a Portfolio"
*/
