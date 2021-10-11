import middy, { MiddyfiedHandler } from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler, Context } from "aws-lambda";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import { PortfolioStep, schema, schemaWrapper } from "../models/PortfolioStep";
import { ApiSuccessResponse, DatabaseResult, DynamoDBException, SuccessStatusCode } from "../utils/response";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../utils/errors";
import { PORTFOLIO_STEP } from "../models/PortfolioDraft";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodbDocumentClient as client } from "../utils/dynamodb";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import httpEventNormalizer from "@middy/http-event-normalizer";
import { customMiddleware } from "../utils/customMiddleware";

// This is a wrapper for the ApiGatewayProxyEvent will be moved somewhere else
// middy validator & http-json-body-parser gives us a parsed, validated body in the APIGatewayProxyEvent with type of <T>
// middy http-event-normalizer makes several fields on our ValidatedEvent NonNullable (see portfolioDraftId!, might need tweaking)
interface NormalizedValidatedEvent<T> extends Omit<APIGatewayProxyEvent, "body"> {
  queryStringParameters: NonNullable<APIGatewayProxyEvent["queryStringParameters"]>;
  multiValueQueryStringParameters: NonNullable<APIGatewayProxyEvent["multiValueQueryStringParameters"]>;
  pathParameters: NonNullable<APIGatewayProxyEvent["pathParameters"]>;
  body: T; // parsed body is type T
}
// APIGatewayProxyEventHandler for our NormalizedValidatedEvent
export type CustomAPIGatewayProxyEventHandler<T> = Handler<NormalizedValidatedEvent<T>, APIGatewayProxyResult>;

// middyfy is a function that wraps the ApiGatewayProxyEvent
export const middyfy = (
  handler: CustomAPIGatewayProxyEventHandler<never>,
  schema: Record<string, unknown>
): MiddyfiedHandler<NormalizedValidatedEvent<never>, APIGatewayProxyResult, Error, Context> => {
  handler.toString();
  return middy(handler)
    .use(jsonBodyParser()) // parse the event.body to ensure its valid json
    .use(httpEventNormalizer()) // check the path params, query params, and ensure they are not null
    .use(
      validator({
        // ajv validator module
        // you could also try customMiddleware, but its slower
        inputSchema: schema,
      })
    )
    .use(JSONErrorHandlerMiddleware());
};

const hello: CustomAPIGatewayProxyEventHandler<PortfolioStep> = async (event) => {
  console.log(event.body);
  const portfolioStep: PortfolioStep = event.body;
  const portfolioDraftId = event.pathParameters.portfolioDraftId!;
  // Perform database call
  const databaseResult = await createPortfolioStepCommand(portfolioDraftId, portfolioStep);
  if (databaseResult instanceof DynamoDBException) {
    return databaseResult.errorResponse;
  }
  return new ApiSuccessResponse<PortfolioStep>(event.body, SuccessStatusCode.CREATED);
};

export const handler = middyfy(hello, schemaWrapper);

export async function createPortfolioStepCommand(
  portfolioDraftId: string,
  portfolioStep: PortfolioStep
): Promise<DatabaseResult> {
  const now = new Date().toISOString();
  try {
    return await client.send(
      new UpdateCommand({
        TableName: process.env.ATAT_TABLE_NAME ?? "",
        Key: {
          id: portfolioDraftId,
        },
        UpdateExpression: `set #portfolioVariable = :portfolio, updated_at = :now,
          #portfolioName = :portfolioName, #portfolioDescription = :portfolioDescription, num_portfolio_managers = :numOfManagers`,
        ExpressionAttributeNames: {
          "#portfolioVariable": PORTFOLIO_STEP,
          "#portfolioName": "name",
          "#portfolioDescription": "description",
        },
        ExpressionAttributeValues: {
          ":portfolio": portfolioStep,
          ":now": now,
          ":portfolioName": portfolioStep.name,
          ":portfolioDescription": portfolioStep.description,
          ":numOfManagers": portfolioStep.portfolio_managers.length,
        },
        ConditionExpression: "attribute_exists(created_at)",
        ReturnValues: "ALL_NEW",
      })
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return new DynamoDBException(NO_SUCH_PORTFOLIO_DRAFT);
    }
    // 5xx error logging
    console.log(error);
    throw error;
  }
}
