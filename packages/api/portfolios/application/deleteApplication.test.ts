import { handler } from "../application/deleteApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { NoContentResponse, SuccessStatusCode } from "../../utils/response";
import { ErrorStatusCode } from "../../../email/utils/statusCodesAndErrors";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {},
  pathParameters: {
    portfolioId: "8e935e1c-cbc9-4db5-81dd-d811652d2b8f",
    applicationId: "fc326ddd-6e17-4409-aa8e-bde07f6d31e7",
  },
} as any;
// These local tests only work the proper local db environment
describe("Local deleteApplication tests", () => {
  it.skip("should delete the application and return 204", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result);
    expect(result).toBeInstanceOf(NoContentResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.NO_CONTENT);
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
