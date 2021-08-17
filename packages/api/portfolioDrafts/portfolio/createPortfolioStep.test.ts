import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { PortfolioStep } from "../../models/PortfolioStep";
import {
  createPortfolioStepCommand,
  EMPTY_REQUEST_BODY,
  handler,
  NO_SUCH_PORTFOLIO,
  REQUEST_BODY_INVALID
} from "./createPortfolioStep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Dynamodb mock validation", function () {
  it("should get user names from the DynamoDB", async () => {
    const mockResponse = {
      updated_at: "2021-08-13T20:55:02.595Z",
      created_at: "2021-08-13T20:51:45.979Z",
      portfolio_step: {
        name: "Test portfolio",
        description: "Test portfolio description",
        portfolio_managers: [Array],
        dod_components: [Array],
      },
      num_portfolio_managers: 0,
      status: "not_started",
      id: "595c31d3-190c-42c3-a9b6-77325fa5ed38",
    };

    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    // setting up new request
    const requestBody = {
      name: "Test portfolio",
      description: "Team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    const portfolioStep: PortfolioStep = requestBody;
    const data = await createPortfolioStepCommand("mock-table", "595c31d3-190c-42c3-a9b6-77325fa5ed38", portfolioStep);
    expect(data.Attributes).toEqual(mockResponse);
  });
});

describe("Validation of handler", function () {
  it("should return EMPTY_REQUEST_BODY when body is empty", async () => {
    const request = {
      body: "",
    } as APIGatewayProxyEvent;
    const response = await handler(request);
    expect(response).toEqual(EMPTY_REQUEST_BODY);
  });
  it("should return NO_SUCH_PORTFOLIO when no portfolioId specified", async () => {
    const request = {
      body: `"{"hi":"123"}"`,
    } as APIGatewayProxyEvent;
    const response = await handler(request);
    expect(response).toEqual(NO_SUCH_PORTFOLIO);
  });
  it("should return REQUEST_BODY_INVALID when invalid JSON provided", async () => {
    const request: APIGatewayProxyEvent = {
      body: `"{"hi": "123",}"`, // invalid JSON comma at end
      pathParameters: { portfolioDraftId: "1234" },
    } as any;

    const response = await handler(request);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
  it("should return REQUEST_BODY_INVALID when invalid PortfolioStep object provided", async () => {
    const requestBodyMissingDescription = {
      name: "Zach's portfolio name",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    const request: APIGatewayProxyEvent = {
      body: JSON.stringify(requestBodyMissingDescription), // invalid PortfolioStep object
      pathParameters: { portfolioDraftId: "1234" },
    } as any;

    const response = await handler(request);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
});
describe("Handler response with mock dynamodb", function () {
  it("should return error when the portfolioDraft doesn't exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    // setting up new request
    const requestBody = {
      name: "Test portfolio",
      description: "Team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };

    const request: APIGatewayProxyEvent = {
      body: JSON.stringify(requestBody),
      pathParameters: { portfolioDraftId: "1234" },
    } as any;

    const data = await handler(request);
    expect(data).toEqual(NO_SUCH_PORTFOLIO);
  });

  it("should return database error when unknown internal problem occurs", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "InternalServiceError" });
    // setting up new request
    const requestBody = {
      name: "Test portfolio",
      description: "Team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };

    const request: APIGatewayProxyEvent = {
      body: JSON.stringify(requestBody),
      pathParameters: { portfolioDraftId: "1234" },
    } as any;

    const data = await handler(request);
    expect(data.body).toEqual(`{"code":"OTHER","message":"Database error: InternalServiceError"}`);
  });
});
