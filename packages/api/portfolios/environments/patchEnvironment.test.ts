import { handler } from "./patchEnvironment";
import { Context } from "aws-lambda";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { IEnvironment, IEnvironmentOperators } from "../../../orm/entity/Environment";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";

describe("patchEnvironment", () => {
  it.skip("successful operation testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironmentOperators> = {
      body: {
        administrators: ["admin1@mail.mil", "admin2@mail.mil"],
        // contributors: ["worker@mail.mil"],
        // readOnlyOperators: ["@mail.mil"],
      },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "fe9274d4-6045-4e9d-97da-65e63980a1b1",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(SuccessStatusCode.OK);
  });
  it.skip("portfolioId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { administrators: ["admin@mail.mil"] },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad5", // bad portfolio Id
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "fe9274d4-6045-4e9d-97da-65e63980a1b1",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("applicationId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { administrators: ["admin@mail.mil"] },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70864", // bad application Id
        environmentId: "fe9274d4-6045-4e9d-97da-65e63980a1b1",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
  it.skip("environmentId not found error, testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IEnvironment> = {
      body: { administrators: ["admin@mail.mil"] },
      pathParameters: {
        portfolioId: "91c6bd1f-5ed8-413b-8f85-55a62dd50ad3",
        applicationId: "7bc938ca-4c1c-4740-8ccf-18c940a70862",
        environmentId: "fe9274d4-6045-4e9d-97da-65e63980a1b5", // bad environment Id
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    console.log(result?.body);
    expect(result?.statusCode).toBe(ErrorStatusCode.NOT_FOUND);
  });
});
