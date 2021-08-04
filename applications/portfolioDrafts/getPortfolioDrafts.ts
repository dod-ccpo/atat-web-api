import { APIGatewayProxyResult } from "aws-lambda";
import { NoContentResponse } from "./utils/response";

/**
 * Gets all Portfolio Drafts, TODO: "...to which the user has read access"
 * Revisit once authentication and authorization are in place.
 * @param event - The GET request from API Gateway
 */
export const handler = async (): Promise<APIGatewayProxyResult> => {
  return new NoContentResponse();
};
