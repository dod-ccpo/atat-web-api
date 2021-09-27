/*
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createPortfolioStep, PortfolioStep } from "../models/PortfolioStep";
import { createPortfolioStepCommand } from "../portfolioDrafts/portfolio/createPortfolioStep";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "./errors";
import { ApiSuccessResponse, SuccessStatusCode } from "./response";
import { isValidJson, isValidUuidV4 } from "./validation";

export async function handler(event: APIGatewayProxyEvent, fn: ()): Promise<APIGatewayProxyResult> {
  const portfolioDraftId = event.pathParameters?.portfolioDraftId;
  if (!isValidUuidV4(portfolioDraftId!)) {
    return NO_SUCH_PORTFOLIO_DRAFT;
  }
  if (!isValidJson(event.body!)) {
    return REQUEST_BODY_INVALID;
  }
  // const requestBody = JSON.parse(event.body!);
  const portfolioStep = createPortfolioStep(JSON.parse(event.body!));
  // const portfolioStep: PortfolioStep = requestBody;
  // const portfolioStep = requestBody as PortfolioStep;
  //  const portfolioStep: PortfolioStep = JSON.parse(event.body!);
  // const idiot: PortfolioStep = { name: "bob", ree: "reee" };

  try {
    await createPortfolioStepCommand(portfolioDraftId!, portfolioStep);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return NO_SUCH_PORTFOLIO_DRAFT;
    }
    console.log("Database error: " + error.name);
    return DATABASE_ERROR;
  }
  return new ApiSuccessResponse<PortfolioStep>(portfolioStep, SuccessStatusCode.CREATED);
}
*/
