import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { APPLICATION_STEP } from "../../models/PortfolioDraft";
import { ApplicationStep } from "../../models/ApplicationStep";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { isPathParameterPresent, isValidUuidV4 } from "../../utils/validation";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  NO_SUCH_APPLICATION_STEP,
  PATH_VARIABLE_REQUIRED_BUT_MISSING,
  PATH_VARIABLE_INVALID,
} from "../../utils/errors";

export async function getApplicationStep(portfolioDraftId: string): Promise<GetCommandOutput> {
  return client.send(
    new GetCommand({
      TableName: process.env.ATAT_TABLE_NAME ?? "",
      Key: {
        id: portfolioDraftId,
      },
      ProjectionExpression: APPLICATION_STEP,
    })
  );
}

/**
 * Gets the Application Step of the specified Portfolio Draft if it exists
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isPathParameterPresent(portfolioDraftId)) {
    return PATH_VARIABLE_REQUIRED_BUT_MISSING;
  }
  if (!isValidUuidV4(portfolioDraftId)) {
    return PATH_VARIABLE_INVALID;
  }
  try {
    const data = await getApplicationStep(portfolioDraftId);
    if (!data.Item?.application_step) {
      return NO_SUCH_APPLICATION_STEP;
    }
    return new ApiSuccessResponse<ApplicationStep>(data.Item.application_step as ApplicationStep, SuccessStatusCode.OK);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.error("Database error: " + error);
    return DATABASE_ERROR;
  }
}
