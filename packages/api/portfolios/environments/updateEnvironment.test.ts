import { handler } from "./updateEnvironment";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { IEnvironment } from "../../../orm/entity/Environment";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("updateEnvironment", () => {
  it.skip("successful operation testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: {
        name: "new name",
        // an empty array is returned when an operator property is not provided
        administrators: ["rootAdmin@mail.mil"],
        // contributors: ["dev@mail.mil"],
        // readOnlyOperators: ["qa@mail.mil"],
      },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "4097ff2a-7a1e-4e2d-ac30-21e9faa4ae9b",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.OK);
  });
  it.skip("no body, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      // body: { name: "coolest env" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "4097ff2a-7a1e-4e2d-ac30-21e9faa4ae9b",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it.skip("portfolioId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { name: "try errors again" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // bad portfolio Id
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "4097ff2a-7a1e-4e2d-ac30-21e9faa4ae9b",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("applicationId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { name: "try errors again" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70864", // bad application Id
        environmentId: "4097ff2a-7a1e-4e2d-ac30-21e9faa4ae9b",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("environmentId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { name: "try errors again" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "4097ff2a-7a1e-4e2d-ac30-21e9faa4ae98", // bad environment Id
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
