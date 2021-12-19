import { handler } from "../application/patchApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { ErrorStatusCode } from "../../../email/utils/statusCodesAndErrors";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {
    administrators: ["bob@gmail.com"],
  },
  pathParameters: {
    portfolioId: "8e935e1c-cbc9-4db5-81dd-d811652d2b8f",
    applicationId: "e1a847d7-1dea-4ddc-8563-65bb7097e22e",
  },
} as any;
// These local tests only work the proper local db environment
describe("Local patchApplication tests", () => {
  it.skip("should return valid Application with updated operators", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
});
// Validation tests
describe("Validation tests", () => {
  it("should fail due to having an incorrect path parameter", async () => {
    const validRequest: ApiGatewayEventParsed<any> = {
      body: {},
      pathParameters: {
        portfolioId: "wrong",
        applicationId: "also wrong", // both are wrong
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
