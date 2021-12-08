import middy from "@middy/core";
import { APIGatewayProxyWithCognitoAuthorizerEvent, APIGatewayProxyResult, Context } from "aws-lambda";

import { createConnection } from "./utils/database";
import { IpCheckerMiddleware } from "./utils/ipLogging";

async function baseHandler(
  event: APIGatewayProxyWithCognitoAuthorizerEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  try {
    const connection = await createConnection();
    const queries = [`SELECT current_database();`, `SELECT * FROM pg_catalog.pg_tables;`];

    for (const query of queries) {
      console.log(
        JSON.stringify({
          query: query,
          result: connection.query(query),
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "200", message: "Hello, world" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "500", error: "Unknown" }),
    };
  }
}

export const handler = middy(baseHandler).use(IpCheckerMiddleware());
