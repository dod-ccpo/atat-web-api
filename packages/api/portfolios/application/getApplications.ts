import "reflect-metadata";
import { APIGatewayProxyResult, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
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
 * Retrieve all Applications associated with the provided portfolioId
 *
 * @param event - The POST request from API Gateway
 */
export async function baseHandler(
  event: ApiGatewayEventParsed<Application>,
  context?: Context
): Promise<APIGatewayProxyResult> {
  validateRequestShape<Application>(event);
  const portfolioId = event.pathParameters?.portfolioId as string;
  let response;
  // Establish database connection
  const connection = await createConnection();
  try {
    // Retrieve application based on applicationId
    response = await connection.getCustomRepository(ApplicationRepository).getApplicationsByPortfolioId(portfolioId);
    console.log("Response:" + JSON.stringify(response));
  } finally {
    connection.close();
  }

  return new ApiSuccessResponse<Array<Application>>(response, SuccessStatusCode.CREATED);
}

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware())
  .use(cors(CORS_CONFIGURATION));
