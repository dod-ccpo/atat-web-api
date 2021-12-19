import { handler } from "../application/getApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { ErrorStatusCode } from "../../../email/utils/statusCodesAndErrors";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {},
  pathParameters: {
    portfolioId: "8e935e1c-cbc9-4db5-81dd-d811652d2b8f",
    applicationId: "1af0d060-5eb9-4817-8a34-c6cd5ec69b05",
  },
} as any;
// These local tests only work the proper local db environment
describe("Local createApplication tests", () => {
  it.skip("should return valid Application", async () => {
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
        applicationId: "also wrong", // both path params will trigger 404 due to not being UUIDv4
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
