import { Callback, Context } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "./createPortfolioStep";
import { mockClient } from "aws-sdk-client-mock";
import { NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { mockPortfolioStep, mockValidPortfolioSteps } from "./commonPortfolioMockData";
import { validRequest } from "../commonPortfolioDraftMockData";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Successful operations test", () => {
  it.each(mockValidPortfolioSteps)(
    "should return portfolio step and http status code 201",
    async (mockPortfolioStep) => {
      const request: ApiGatewayEventParsed<PortfolioStep> = {
        ...validRequest,
        body: mockPortfolioStep,
      } as any;
      const response = await handler(request, {} as Context, null as unknown as Callback)!;
      expect(response).toBeInstanceOf(ApiSuccessResponse);
      expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
    }
  );
});

describe("Validation of handler", () => {
  it("should return NO_SUCH_PORTFOLIO_DRAFT when no portfolioDraftId specified", async () => {
    const request = {
      body: mockPortfolioStep,
      // no pathParameter portfolioDraftId
    } as ApiGatewayEventParsed<PortfolioStep>;
    const response = await handler(request, {} as Context, null as unknown as Callback)!;
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});

describe.each(mockValidPortfolioSteps)("Handler response with mock dynamodb", (mockPortfolioStep) => {
  const request: ApiGatewayEventParsed<PortfolioStep> = {
    ...validRequest,
    body: mockPortfolioStep,
  } as any;

  it("should return error when the portfolioDraft doesn't exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const response = await handler(request, {} as Context, null as unknown as Callback)!;
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});

describe("Cross-Site Scripting (XSS) tests", () => {
  // example attacks from ASD STIG: V-222602 text
  const attacks = ["<script>alert('attack!')</script>", "<img src=x onerror='alert(document.cookie);'"];
  it.each(attacks)("should sanitize input for XSS attacks", async (attackCode) => {
    const mockPortfolioStep: PortfolioStep = {
      ...mockValidPortfolioSteps[0],
      description: attackCode,
      name: attackCode,
    };
    const request: ApiGatewayEventParsed<PortfolioStep> = {
      ...validRequest,
      body: mockPortfolioStep,
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
