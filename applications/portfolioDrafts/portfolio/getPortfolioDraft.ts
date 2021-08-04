import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { PortfolioStep } from "../models/PortfolioStep";
import { dynamodbClient as client } from "../utils/dynamodb";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { isPortfolioStep, isValidJson } from "../utils/validation";

const TABLE_NAME = process.env.ATAT_TABLE_NAME;
const NO_SUCH_PORTFOLIO = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);
const REQUEST_BODY_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "A valid PortfolioStep object must be provided" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Submits the Portfolio Step of the Portfolio Draft Wizard
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;

  if (!portfolioDraftId) {
    return NO_SUCH_PORTFOLIO;
  }

  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      id: portfolioDraftId,
    },
    ProjectionExpression: "portfolio_step",
  });

  try {
    const data = await client.send(command);
    const responseBody = JSON.stringify(data.Item);
    const portfolioStep: PortfolioStep = JSON.parse(responseBody);
    console.log("Sanity check" + responseBody);
    /*
    if (!isPortfolioStep(responseBody)) {
      return NO_SUCH_PORTFOLIO;
    } */
    return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return NO_SUCH_PORTFOLIO;
    }
    console.log("Database error: " + error.name);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Database error: " + error.name },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
};
