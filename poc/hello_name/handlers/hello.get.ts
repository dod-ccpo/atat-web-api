import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ApiResult } from "../../lib/response";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const name = event.queryStringParameters?.name;

  if (name) {
    return new ApiResult(200, { result: { message: `Hello, ${name}!` } });
  }

  return new ApiResult(400, { errorCode: "MissingParameter", errorMessage: "The name parameter is required" });
};
