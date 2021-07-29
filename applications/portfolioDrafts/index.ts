import { APIGatewayProxyResult } from "aws-lambda";

export const handler = async (event: APIGatewayProxyResult): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    body: "Hello, World!",
  };
};
