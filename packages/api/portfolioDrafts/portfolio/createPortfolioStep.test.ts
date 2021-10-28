import { Callback, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "./createPortfolioStep";
import { mockClient } from "aws-sdk-client-mock";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { mockPortfolioStep, mockValidPortfolioSteps } from "./commonPortfolioMockData";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const now = new Date().toISOString();

describe("Successful operations test", () => {
  const mockResponse = {
    updated_at: now,
    created_at: now,
    status: ProvisioningStatus.NOT_STARTED,
    id: uuidv4(),
  };
  it.each(mockValidPortfolioSteps)("should return portfolio step and http status code 201", async (requestBody) => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });

    const validRequest: ApiGatewayEventParsed<PortfolioStep> = {
      body: requestBody,
      pathParameters: { portfolioDraftId: mockResponse.id },
    } as any;
    const response = await handler(validRequest, {} as Context, null as unknown as Callback)!;
    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
});

describe("Validation of handler", () => {
  it("should return NO_SUCH_PORTFOLIO_DRAFT when no portfolioId specified", async () => {
    const request = {
      body: mockPortfolioStep,
    } as ApiGatewayEventParsed<PortfolioStep>;
    const response = await handler(request, {} as Context, null as unknown as Callback)!;
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});

describe.each(mockValidPortfolioSteps)("Handler response with mock dynamodb", (mockPortfolioStep) => {
  const request: ApiGatewayEventParsed<PortfolioStep> = {
    body: mockPortfolioStep,
    pathParameters: { portfolioDraftId: uuidv4() },
  } as any;

  it("should return error when the portfolioDraft doesn't exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const data = await handler(request, {} as Context, null as unknown as Callback)!;
    console.log(data);
    expect(data).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});

describe("Cross-Site Scripting (XSS) tests", () => {
  // example attacks from ASD STIG: V-222602 text
  const attacks = ["<script>alert('attack!')</script>", "<img src=x onerror='alert(document.cookie);'"];
  it.each(attacks)("should sanitize input for XSS attacks", async (attackCode) => {
    const requestBody: PortfolioStep = {
      ...mockValidPortfolioSteps[0],
      description: attackCode,
      name: attackCode,
    };
    const request: ApiGatewayEventParsed<PortfolioStep> = {
      body: requestBody,
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    // expect request to contain an XSS attack
    expect(request.body.description).toEqual(attackCode);
    expect(request.body.name).toEqual(attackCode);
    // confirm attack is not present in the response
    const response = await handler(request, {} as Context, null as unknown as Callback)!;
    expect(JSON.parse(response.body).description).not.toEqual(attackCode);
    expect(JSON.parse(response.body).name).not.toEqual(attackCode);
  });
});
