import { handler } from "./deleteEnvironment";
import { handler as getEnvironment } from "./getEnvironment";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("deleteEnvironment", () => {
  const validRequest: APIGatewayProxyEvent = {
    body: {},
    pathParameters: {
      portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
      environmentId: "6093e0b9-20ed-48d0-9473-7eb05a55dbf1",
    },
    requestContext: { identity: { sourceIp: "7.7.7.7" } },
  } as any;
  it.skip("successful operation testing locally only", async () => {
    // first request to delete environment
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.NO_CONTENT);

    // second request to delete same environment
    const secondCall = await handler(validRequest, {} as Context, () => null);
    expect(secondCall?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);

    // GET request for the same environment (no longer exists)
    const getEnvRequest = await getEnvironment(validRequest, {} as Context, () => null);
    expect(getEnvRequest?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("portfolioId not found, testing locally only", async () => {
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
  it.skip("applicationId not found, testing locally only", async () => {
    const badApplicationIdRequest: APIGatewayProxyEvent = {
      ...validRequest,
      pathParameters: {
        ...validRequest.pathParameters,
        applicationId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // no application with id
      },
    } as any;
    const result = await handler(badApplicationIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("environmentId not found, testing locally only", async () => {
    const badEnvironmentIdRequest: APIGatewayProxyEvent = {
      ...validRequest,
      pathParameters: {
        ...validRequest.pathParameters,
        environmentId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // no environment with id
      },
    } as any;
    const result = await handler(badEnvironmentIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
