import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ApiSuccessResponse, SuccessStatusCode } from "../../utils/response";
import {
  createPortfolioStepCommand,
  EMPTY_REQUEST_BODY,
  handler,
  NO_SUCH_PORTFOLIO,
  REQUEST_BODY_INVALID,
} from "./createPortfolioStep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const mockResponse = {
  updated_at: "2021-08-13T20:55:02.595Z",
  created_at: "2021-08-13T20:51:45.979Z",
  portfolio_step: {
    name: "Test portfolio",
    description: "Team america",
    portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com", "hardwork@example.com"],
    dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
  },
  status: "not_started",
  id: "595c31d3-190c-42c3-a9b6-77325fa5ed38",
};

describe("Dynamodb mock validation", function () {
  it("should get user names from the DynamoDB", async () => {
    const goodMockResponse = {
      ...mockResponse,
      num_portfolio_managers: 3,
    };

    ddbMock.on(UpdateCommand).resolves({
      Attributes: goodMockResponse,
    });
    // setting up new request
    const portfolioStep: PortfolioStep = mockResponse.portfolio_step; // request body
    const data = await createPortfolioStepCommand("595c31d3-190c-42c3-a9b6-77325fa5ed38", portfolioStep);
    expect(data.Attributes).toEqual(goodMockResponse);
  });
});

describe("Successful operations test", function () {
  it("should return funding step and http status code 201", async () => {
    const goodMockResponse = {
      ...mockResponse,
      num_portfolio_managers: 3,
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: goodMockResponse,
    });

    const validRequest: APIGatewayProxyEvent = {
      body: JSON.stringify(goodMockResponse.portfolio_step),
      pathParameters: { portfolioDraftId: goodMockResponse.id },
    } as any;
    const response = await handler(validRequest);
    const numOfPortfolioManagers: number = JSON.parse(response.body).portfolio_managers.length;

    expect(response).toBeInstanceOf(ApiSuccessResponse);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(response.body).toStrictEqual(JSON.stringify(goodMockResponse.portfolio_step));
    expect(numOfPortfolioManagers).toBe(goodMockResponse.num_portfolio_managers);
  });
});

describe("Incorrect number of task orders", function () {
  const badMockResponse = {
    ...mockResponse,
    num_portfolio_managers: 77,
  };
  it("should return falsy due to incorrect number of applications and environments", async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: badMockResponse,
    });
    const result = await createPortfolioStepCommand(
      "595c31d3-190c-42c3-a9b6-77325fa5ed38",
      badMockResponse.portfolio_step
    );
    const numOfPortfolioManagers: number = result.Attributes?.portfolio_step.portfolio_managers.length;
    expect(numOfPortfolioManagers === badMockResponse.num_portfolio_managers).toBeFalsy();
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
    expect(data.body).toEqual(`{"code":"OTHER","message":"Database error"}`);
  });
});
