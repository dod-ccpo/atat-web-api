import { handler } from "./createEnvironment";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { IEnvironmentCreate } from "../../../orm/entity/Environment";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("createEnvironment", () => {
  const validRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
    body: { name: "new local testing after refactor" },
    pathParameters: {
      portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
      applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
    },
    requestContext: { identity: { sourceIp: "7.7.7.7" } },
  } as any;
  it.skip("successful operation testing locally only", async () => {
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.CREATED);
  });
  it.skip("requests with properties from BaseObject should cause status code 400", async () => {
    const badPropertiesRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      ...validRequest,
      body: {
        name: "flaw check 1",
        id: "7bc938ca-4c1c-4740-8ccf-18c940a70865",
        createdAt: "2020-12-17T18:29:42.769Z",
        updatedAt: "2020-12-17T18:29:42.769Z",
        archivedAt: "2099-12-17T18:29:42.769Z",
      },
    } as any;
    const result = await handler(badPropertiesRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it.skip("not a unique env name error, testing locally only", async () => {
    const sameNameRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      ...validRequest,
      body: { name: "naming makes a big difference" },
    } as any;
    const result = await handler(sameNameRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it.skip("no body, testing locally only", async () => {
    const noBodyRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      // body: { name: "coolest env" },
      pathParameters: validRequest.pathParameters,
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(noBodyRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it.skip("portfolioId not found error, testing locally only", async () => {
    const badPortfolioIdRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      ...validRequest,
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // bad portfolio Id
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
      },
    } as any;
    const result = await handler(badPortfolioIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("applicationId not found error, testing locally only", async () => {
    const badApplicationIdRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      ...validRequest,
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70864", // bad application Id
      },
    } as any;
    const result = await handler(badApplicationIdRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
