import cors from "@middy/http-cors";
import createError from "http-errors";
import jsonBodyParser from "@middy/http-json-body-parser";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import middy from "@middy/core";
import validator from "@middy/validator";
import xssSanitizer from "../portfolioDrafts/xssSanitizer";
import { ApiGatewayEventParsed } from "../utils/eventHandlingTool";
import { APIGatewayProxyEventPathParameters, APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../utils/response";
import { CORS_CONFIGURATION } from "../utils/corsConfig";
import { createConnection } from "typeorm";
import { DATABASE_ERROR } from "../utils/errors";
import { Environment } from "../orm/entity/Environment";
import { errorHandlingMiddleware } from "../utils/errorHandlingMiddleware";
import { Portfolio } from "../orm/entity/Portfolio";
import { PortfolioRepository } from "../orm/repository/PortfolioRepository";
import { wrapSchema } from "../utils/schemaWrapper";
import "reflect-metadata";
import internalSchema = require("../models/internalSchema.json");

/**
 * Create Portfolio
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Environment>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const parameters = Object.entries(event.pathParameters as APIGatewayProxyEventPathParameters);
  console.log("got params: ", parameters);

  if (event.body === undefined) {
    throw createError(400, "Shape validation failed, invalid request body");
  }

  // for local development
  const connection = await createConnection();
  let response;

  const testData = {
    name: "Cheetah portfolio",
    description: "Description of portfolio",
    // csp: CloudServiceProvider.CSP_A,
    // dodComponents: [DodComponent.ARMY, DodComponent.NAVY],
    // owner: "powner@dod.mil",
    // portfolioManagers: ["jane.manager@dod.mil", "john.manager@dod.mil"],
    // provisioningStatus: ProvisioningStatus.NOT_STARTED,
    // taskOrders: [],
    // applications: [],
    // administrators: [],
    // constributors: [],
    // readOnlyOperators: [],
  };

  try {
    console.log("getting portfolio repository...");
    const insertResult = await connection.getCustomRepository(PortfolioRepository).createPortfolio(testData);

    console.log("inserting portfolio...");
    for (const insertId of insertResult.identifiers) {
      console.log("insertId: ", insertId);
    }
    response = new ApiSuccessResponse<Portfolio>(response as Portfolio, SuccessStatusCode.CREATED);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  } finally {
    connection.close();
  }
  return response;
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(internalSchema.PortfolioBase) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
