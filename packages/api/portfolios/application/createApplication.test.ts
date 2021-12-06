import { handler } from "../application/createApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";

const validRequest: ApiGatewayEventParsed<any> = {
  body: { name: "the name", description: "the description" },
  pathParameters: { portfolioId: "6558c17d-5ebe-4dc3-a15a-3c3b0dd7b0d2" },
} as any;

async function testDB(request: any) {
  const result = await handler(request, {} as Context, () => null);
  console.log(result?.body);
}
testDB(validRequest);
