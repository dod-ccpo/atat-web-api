import "reflect-metadata";
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
import { CloudServiceProvider, DodComponent, Portfolio } from "../../orm/entity/Portfolio";
import { CORS_CONFIGURATION } from "../utils/corsConfig";
import { createConnection } from "typeorm";
import { DATABASE_ERROR } from "../utils/errors";
import { errorHandlingMiddleware } from "../utils/errorHandlingMiddleware";
import { PortfolioRepository } from "../../orm/repository/PortfolioRepository";
import { ProvisioningStatus } from "../../orm/entity/ProvisionableEntity";
import { wrapSchema } from "../utils/schemaWrapper";
import internalSchema = require("../models/internalSchema.json");

/**
 * Create Portfolio
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Portfolio>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  const parameters = Object.entries(event.pathParameters as APIGatewayProxyEventPathParameters);
  console.log("got params: ", parameters);

  if (event.body === undefined) {
    throw createError(400, "Shape validation failed, invalid request body");
  }

  const connection = await createConnection();
  let response: Portfolio | unknown;

  const testData = {
    // id: uuidv4(),
    // createdAt: now,
    // updatedAt: now,
    name: "Cheetah portfolio",
    description: "Description of portfolio",
    csp: CloudServiceProvider.CSP_A,
    dodComponents: [DodComponent.ARMY, DodComponent.NAVY],
    owner: "powner@dod.mil",
    portfolioManagers: ["jane.manager@dod.mil", "john.manager@dod.mil"],
    provisioningStatus: ProvisioningStatus.PENDING,
  };

  try {
    console.log("getting portfolio repository...");
    const insertResult = await connection.getCustomRepository(PortfolioRepository).createPortfolio(testData);

    console.log("inserting portfolio...");
    for (const insertId of insertResult.identifiers) {
      console.log("insertId: ", insertId);
    }
    return new ApiSuccessResponse<Portfolio>(response as Portfolio, SuccessStatusCode.CREATED);
  } catch (error) {
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  } finally {
    connection.close();
  }
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: wrapSchema(internalSchema.Portfolio) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
