import { handler } from "./getEnvironments";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { IEnvironmentCreate } from "../../../orm/entity/Environment";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("getEnvironments", () => {
  it.skip("successful operation testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      body: { name: "new local testing and a unique name" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.OK);
  });
  it.skip("portfolioId not found, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      body: { name: "new local testing and a unique name" },
      pathParameters: {
        // portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("applicationId not found, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironmentCreate> = {
      body: { name: "new local testing and a unique name" },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        // applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70864",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
