import { handler } from "./createPortfolio";
import { ApiGatewayEventParsed } from "../utils/eventHandlingTool";
import { CloudServiceProvider, DodComponent, IPortfolioCreate } from "../../orm/entity/Portfolio";
import { ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { Context } from "aws-lambda";
import { ProvisioningStatus } from "../../orm/entity/ProvisionableEntity";

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
  it("requests with audit properties should cause 400 BAD REQUEST", async () => {
    const validRequest: ApiGatewayEventParsed<IPortfolioCreate> = {
      body: {
        id: "",
        createdAt: "",
        updatedAt: "",
        archivedAt: "",
      },
      requestContext: { identity: { sourceIp: "7.7.7.7" } },
    } as any;
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result?.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
});
