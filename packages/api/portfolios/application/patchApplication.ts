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
import { IApplicationCreate, IApplicationOperators } from "../../../orm/entity/Application";
import { createConnection } from "../../utils/database";
import { ApplicationRepository } from "../../repository/ApplicationRepository";

/**
 * Update operators in target application, based on applicationId
 *
 * @param event - The PATCH request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<IApplicationOperators>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<IApplicationOperators>(event);
  // it seems that we don't even need the portfolioId for this operation
  // we should bring this up to Jeff, and see what he thinks
  const portfolioId = event.pathParameters?.portfolioId as string;
  const applicationId = event.pathParameters?.applicationId as string;
  let response;
  // Establish databse connection
  const connection = await createConnection();
  try {
    // Ensure application exists before updating, throw 404 if it doesn't exist
    const applicationToPatch = await connection
      .getCustomRepository(ApplicationRepository)
      .getApplication(applicationId);
    console.log("Application before patch:" + JSON.stringify(applicationToPatch));
    response = await connection.getCustomRepository(ApplicationRepository).patchApplication(applicationId, event.body);
    console.log("Response:" + JSON.stringify(response));
  } finally {
    connection.close();
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
