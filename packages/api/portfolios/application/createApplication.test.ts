import { handler } from "../application/createApplication";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { ErrorStatusCode } from "../../../email/utils/statusCodesAndErrors";

const validRequest: ApiGatewayEventParsed<any> = {
  body: {
    name: "Zach's test app",
    description: "Description",
    environments: [{ name: "Environment name" }],
  },
  pathParameters: { portfolioId: "8e935e1c-cbc9-4db5-81dd-d811652d2b8f" },
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
  it("should fail due to having no request body", async () => {
    const validRequest: ApiGatewayEventParsed<any> = {
      // body: { name: "coolest app" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it("should fail due to having an incorrect path parameter", async () => {
    const validRequest: ApiGatewayEventParsed<any> = {
      body: { name: "coolest app", description: "Description", environments: [{ name: "Environment name" }] },
      pathParameters: {
        portfolioId: "wrong",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it("should fail validation due to having additional properties at application level", async () => {
    const validRequest: ApiGatewayEventParsed<any> = {
      body: {
        name: "Zach's test app",
        createdAt: "2021-12-17T19:37:18.210Z",
        description: "Description",
        environments: [{ name: "Environment name" }],
      },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it("should fail validation due to having additional properties at environment level", async () => {
    const validRequest: ApiGatewayEventParsed<any> = {
      body: {
        name: "Zach's test app",
        description: "Description",
        environments: [{ name: "Environment name", createdAt: "2021-12-17T19:37:18.210Z" }],
      },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;

    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
});
