import { GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../../models/Error";
import { PORTFOLIO_STEP } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { dynamodbDocumentClient as client } from "../../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

const TABLE_NAME = process.env.ATAT_TABLE_NAME ?? "";
const NO_SUCH_PORTFOLIO_STEP = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Step not found for this Portfolio Draft" },
  ErrorStatusCode.NOT_FOUND
);
const NO_SUCH_PORTFOLIO = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "The given Portfolio Draft does not exist" },
  ErrorStatusCode.NOT_FOUND
);

async function getPortfolioStepCommand(table: string, portfolioDraftId: string): Promise<GetCommandOutput> {
  const result = await client.send(
    new GetCommand({
      TableName: table,
      Key: {
        id: portfolioDraftId,
      },
      ProjectionExpression: PORTFOLIO_STEP,
    })
  );
  return result;
}

/**
 * Gets the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The GET request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO;
  }

  try {
    const data = await getPortfolioStepCommand(TABLE_NAME, portfolioDraftId);
    if (!data.Item) {
      return NO_SUCH_PORTFOLIO;
    }
    if (!data.Item?.portfolio_step) {
      return NO_SUCH_PORTFOLIO_STEP;
    }
    return new ApiSuccessResponse<PortfolioStep>(data.Item.portfolio_step as PortfolioStep, SuccessStatusCode.OK);
  } catch (error) {
    console.log("Database error (" + error.name + "): " + error);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
}
