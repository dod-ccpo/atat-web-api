import "reflect-metadata";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { NoContentResponse } from "../../utils/response";
import middy from "@middy/core";
import xssSanitizer from "../../utils/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import cors from "@middy/http-cors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { validateRequestShape } from "../../utils/shapeValidator";
import { CORS_CONFIGURATION } from "../../utils/corsConfig";
import { errorHandlingMiddleware } from "../../utils/errorHandlingMiddleware";
import { Application } from "../../../orm/entity/Application";
import { createConnection } from "../../utils/database";
import { ApplicationRepository } from "../../repository/ApplicationRepository";

/**
 * Delete an Application based on applicationId
 *
 * @param event - The DELETE request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Application>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<Application>(event);
  // it seems that we don't even need the portfolioId for this operation
  // we should bring this up to Jeff, and see what he thinks
  const portfolioId = event.pathParameters?.portfolioId as string;
  const applicationId = event.pathParameters?.applicationId as string;
  let response;
  // Establish database connection
  const connection = await createConnection();
  try {
    // Retrieve application based on applicationId
    response = await connection.getCustomRepository(ApplicationRepository).deleteApplication(applicationId);
    console.log("Response:" + JSON.stringify(response));
  } finally {
    connection.close();
  }
  return new NoContentResponse();
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
