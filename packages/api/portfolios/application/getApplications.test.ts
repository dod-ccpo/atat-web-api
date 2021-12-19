import { handler } from "../application/getApplications";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { ErrorStatusCode } from "../../../email/utils/statusCodesAndErrors";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {},
  pathParameters: {
    portfolioId: "8e935e1c-cbc9-4db5-81dd-d811652d2b81",
  },
} as any;
// 8e935e1c-cbc9-4db5-81dd-d811652d2b8f
// These local tests only work the proper local db environment
describe("Local getApplications tests", () => {
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
        portfolioId: "wrong", // invalid path parameter (isn't uuidv4)
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
