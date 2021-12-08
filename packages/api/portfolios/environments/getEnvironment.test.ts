import { handler } from "./getEnvironment";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("getEnvironments", () => {
  const validRequest: APIGatewayProxyEvent = {
    pathParameters: {
      portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
      environmentId: "f04abf05-9689-4d8f-ae8d-c032d342c064",
    },
    requestContext: { identity: { sourceIp: "7.7.7.7" } },
  } as any;
  it("successful operation testing locally only", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.OK);
  });
  it("portfolioId not found, testing locally only", async () => {
    const badPortfolioIdRequest: APIGatewayProxyEvent = {
      ...validRequest,
      pathParameters: {
        ...validRequest.pathParameters,
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // no portfolio with id
      },
    } as any;
    const result = await handler(badPortfolioIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it("applicationId not found, testing locally only", async () => {
    const badApplicationIdRequest: APIGatewayProxyEvent = {
      ...validRequest,
      pathParameters: {
        ...validRequest.pathParameters,
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70864", // no application with id
      },
    } as any;
    const result = await handler(badApplicationIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it("environmentId not found, testing locally only", async () => {
    const badEnvironmentIdRequest: APIGatewayProxyEvent = {
      ...validRequest,
      pathParameters: {
        ...validRequest.pathParameters,
        environmentId: "f04abf05-9689-4d8f-ae8d-c032d342c067", // no environment with id
      },
    } as any;
    const result = await handler(badEnvironmentIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
