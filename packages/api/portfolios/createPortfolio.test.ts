import { ApiGatewayEventParsed } from "../utils/eventHandlingTool";
import { CloudServiceProvider, DodComponent, IPortfolioCreate } from "../../orm/entity/Portfolio";
import { Context } from "aws-lambda";
import { ErrorCode } from "../models/Error";
import { handler } from "./createPortfolio";
import { ProvisioningStatus } from "../../orm/entity/ProvisionableEntity";
import { SuccessStatusCode, ValidationErrorResponse } from "../utils/response";

describe("createPortfolio", () => {
  it.skip("successful operation testing locally only", async () => {
    const validRequest: ApiGatewayEventParsed<IPortfolioCreate> = {
      body: {
        name: "Mock Portfolio",
        owner: "jane.manager@example.mil",
        csp: CloudServiceProvider.CSP_A,
        dodComponents: [DodComponent.ARMY, DodComponent.NAVY],
        portfolioManagers: ["joe.manager@example.mil", "jane.manager@example.mil"],
        description: "Mock portfolio description",
        provisioningStatus: ProvisioningStatus.PENDING,
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result?.statusCode).toBe(SuccessStatusCode.CREATED);
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
      expect(body.error_map[0].keyword).toBe("additionalProperties");
      expect(body.error_map[0].message).toBe("must NOT have additional properties");
    });
  });
});
