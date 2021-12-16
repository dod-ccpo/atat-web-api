import { handler } from "../application/createApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {
    name: "Invalid fake application",
    description: "This application does not exist",
    environments: [{ name: "Cat environment" }, { name: "Fish environment" }, { name: "Dog environment" }],
  },
  pathParameters: { portfolioId: "88fc1582-896e-471f-9189-c1ce1d45e4c7" },
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
