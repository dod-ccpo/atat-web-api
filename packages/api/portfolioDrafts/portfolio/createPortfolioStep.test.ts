import { APIGatewayProxyEvent } from "aws-lambda";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "./createPortfolioStep";
import { mockClient } from "aws-sdk-client-mock";
import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "../../utils/errors";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const now = new Date().toISOString();

const mockValidPortfolioSteps: PortfolioStep[] = [
  // The example PortfolioStepEx from the API Specification
  {
    name: "Mock Portfolio",
    csp: CloudServiceProvider.AWS,
    description: "Mock portfolio description",
    dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
    portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
  },
  // This checks that we don't regress and error on a body that we worked to debug.
  // The issue at the time seemed to be due to a missing `description` field in the
  // request body.
  {
    name: "Tonys Portfolio 10_13_10:14",
    csp: CloudServiceProvider.AWS,
    dod_components: ["marine_corps", "combatant_command", "joint_staff"],
    portfolio_managers: [],
  },
];

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

    const validRequest: APIGatewayProxyEvent = {
      body: JSON.stringify(requestBody),
      pathParameters: { portfolioDraftId: mockResponse.id },
    } as any;
    const response = await handler(validRequest);
    const numOfPortfolioManagers: number = JSON.parse(response.body).portfolio_managers.length;

    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(response.body).toStrictEqual(validRequest.body);
    expect(numOfPortfolioManagers).toBe(requestBody.portfolio_managers.length);
  });
});

describe("Validation of handler", () => {
  it("should return NO_SUCH_PORTFOLIO_DRAFT when no portfolioId specified", async () => {
    const request = {
      body: `"{"hi":"123"}"`,
    } as APIGatewayProxyEvent;
    const response = await handler(request);
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
  it("should return REQUEST_BODY_INVALID when invalid JSON provided", async () => {
    const request: APIGatewayProxyEvent = {
      body: `"{"hi": "123",}"`, // invalid JSON comma at end
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;

    const response = await handler(request);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
});

describe.each(mockValidPortfolioSteps)("Handler response with mock dynamodb", (mockPortfolioStep) => {
  const request: APIGatewayProxyEvent = {
    body: JSON.stringify(mockPortfolioStep),
    pathParameters: { portfolioDraftId: uuidv4() },
  } as any;

  it("should return error when the portfolioDraft doesn't exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const data = await handler(request);
    expect(data).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });

  it("should throw error when unknown dynamodb internal service error occurs", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "InternalServiceError" });
    await expect(handler(request)).rejects.toThrowError();
  });
});
