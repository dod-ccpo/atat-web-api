import { handler } from "../application/createApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";

const validRequest: ApiGatewayEventParsed<any> = {
  body: { name: "1740test", description: "1740test", environments: [{ name: "Scrimblo Environment" }] },
  pathParameters: { portfolioId: "49626f72-2220-42b3-84f0-d921b31b79a7" },
} as any;
// 49626f72-2220-42b3-84f0-d921b31b79a7
describe("Successful operation tests", () => {
  it("should return funding step and http status code 201", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
});
