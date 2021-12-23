import { ApiGatewayEventParsed } from "../utils/eventHandlingTool";
import { CloudServiceProvider, DodComponent, IPortfolioCreate } from "../../orm/entity/Portfolio";
import { Context } from "aws-lambda";
import { ErrorCode } from "../models/Error";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../utils/response";
import { handler } from "./createPortfolio";

describe("createPortfolio", () => {
  it.skip("should return 201 CREATED with empty string request body - testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IPortfolioCreate> = {
      body: "", // empty string
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result?.statusCode).toBe(SuccessStatusCode.CREATED);
  });
  it.skip("should return 201 CREATED with complete request body - testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IPortfolioCreate> = {
      body: {
        name: "Mock Portfolio",
        owner: "jane.manager@example.mil",
        csp: CloudServiceProvider.CSP_A,
        dodComponents: [DodComponent.ARMY, DodComponent.NAVY],
        portfolioManagers: ["joe.manager@example.mil", "jane.manager@example.mil"],
        description: "Mock portfolio description",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result?.statusCode).toBe(SuccessStatusCode.CREATED);
  });
  it("should return 400 BAD_REQUEST with empty object request body", async () => {
    const badRequest: ApiGatewayEventParsed<IPortfolioCreate> = {
      body: {}, // empty JSON object
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(badRequest, {} as Context, () => null);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    const body = JSON.parse(result?.body ?? "");
    expect(body.code).toBe(ErrorCode.INVALID_INPUT);
    expect(body.message).toBe("Request failed validation");
  });
  it("should reject requests that include audit properties, disallowing overwrite", async () => {
    function makeRequestWithPropertyNamed(propertyName: string): ApiGatewayEventParsed<IPortfolioCreate> {
      return {
        body: {
          [propertyName]: "",
          // otherwise valid request body below
          portfolioManagers: ["joe.manager@example.mil", "jane.manager@example.mil"],
          csp: CloudServiceProvider.CSP_A,
        },
        requestContext: { identity: { sourceIp: "7.7.7.7" } },
      } as any;
    }
    const badRequests: Array<ApiGatewayEventParsed<IPortfolioCreate>> = [
      makeRequestWithPropertyNamed("id"),
      makeRequestWithPropertyNamed("createdAt"),
      makeRequestWithPropertyNamed("updatedAt"),
      makeRequestWithPropertyNamed("archivedAt"),
      makeRequestWithPropertyNamed("propertyNotExpected"),
    ];
    badRequests.forEach(async (badRequest) => {
      const result = await handler(badRequest, {} as Context, () => null);
      expect(result).toBeInstanceOf(ValidationErrorResponse);
      const body = JSON.parse(result?.body ?? "");
      expect(body.code).toBe(ErrorCode.INVALID_INPUT);
      expect(body.message).toBe("Request failed validation");
      let foundAdditionalPropertiesKeywordFlag = false;
      body.error_map.forEach((errorItem: any) => {
        if (errorItem.keyword === "additionalProperties") {
          foundAdditionalPropertiesKeywordFlag = true;
        }
      });
      expect(foundAdditionalPropertiesKeywordFlag).toBe(true);
    });
  });
});
