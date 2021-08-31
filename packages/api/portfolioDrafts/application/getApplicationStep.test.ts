import { AccessLevel } from "../../models/AccessLevel";
import { APIGatewayProxyEvent } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Environment } from "../../models/Environment";
import { ErrorCodes } from "../../models/Error";
import { ErrorStatusCode } from "../../utils/response";
import { getApplicationStep, handler } from "./getApplicationStep";
import { mockClient } from "aws-sdk-client-mock";
import { Operator } from "../../models/Operator";
import { v4 as uuid } from "uuid";
import {
  NO_SUCH_PORTFOLIO_DRAFT,
  PATH_VARIABLE_REQUIRED_BUT_MISSING,
  DATABASE_ERROR,
  PATH_VARIABLE_INVALID,
  NO_SUCH_APPLICATION_STEP,
} from "../../utils/errors";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

// Implementation of PortfolioDraftSummaryEx from API spec
const mockOperatorDarthVader: Operator = {
  first_name: "Darth",
  last_name: "Vader",
  email: "iam@yourfather.com",
  access: AccessLevel.ADMINISTRATOR,
};
const mockOperatorHanSolo: Operator = {
  first_name: "Han",
  last_name: "Solo",
  email: "frozen@carbonite.com",
  access: AccessLevel.READ_ONLY,
};
const mockOperatorLukeSkywalker: Operator = {
  first_name: "Luke",
  last_name: "Skywalker",
  email: "lostmy@hand.com",
  access: AccessLevel.READ_ONLY,
};
const mockOperatorSalaciousCrumb: Operator = {
  first_name: "Salacious",
  last_name: "Crumb",
  email: "monkey@lizard.com",
  access: AccessLevel.ADMINISTRATOR,
};
const mockOperatorBobaFett: Operator = {
  first_name: "Boba",
  last_name: "Fett",
  email: "original@mandalorian.com",
  access: AccessLevel.READ_ONLY,
};
const mockEnvironmentCloudCity: Environment = {
  name: "Cloud City",
  operators: [mockOperatorDarthVader, mockOperatorHanSolo, mockOperatorLukeSkywalker],
};
const mockEnvironmentJabbasPalace: Environment = {
  name: "Jabba's Palace",
  operators: [mockOperatorSalaciousCrumb, mockOperatorHanSolo, mockOperatorBobaFett],
};
const mockApplicationStep: ApplicationStep = {
  name: "Mock Application",
  description: "The description of the Mock Application",
  environments: [mockEnvironmentCloudCity, mockEnvironmentJabbasPalace],
};
const mockPortfolioDraftId = uuid();

const normalRequest: APIGatewayProxyEvent = {
  body: "",
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const missingPathVariableRequest: APIGatewayProxyEvent = {
  ...normalRequest,
  pathParameters: {}, // missing portfolioDraftId
} as any;

const invalidPathVariableRequest: APIGatewayProxyEvent = {
  ...normalRequest,
  pathParameters: { portfolioDraftId: "invalid_portfolio_draft_id" }, // invalid
} as any;

describe("TODO list", function () {
  it.todo("should return http status 200 on happy path");
});

describe("when handler() does not receive required parameter 'portfolioDraftId'", function () {
  it("should return error response PATH_VARIABLE_REQUIRED_BUT_MISSING", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(response).toEqual(PATH_VARIABLE_REQUIRED_BUT_MISSING);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
    expect(JSON.parse(response.body).message).toEqual("Required path variable is missing");
  });
});

describe("when handler() receives an invalid 'portfolioDraftId'", function () {
  it("should return error response PATH_VARIABLE_INVALID", async () => {
    const response = await handler(invalidPathVariableRequest);
    expect(response).toEqual(PATH_VARIABLE_INVALID);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
    expect(JSON.parse(response.body).message).toEqual("Invalid path variable");
  });
});

describe("when handler() can not find the Application Step in the given Portfolio Draft", function () {
  it("should return error response NO_SUCH_APPLICATION_STEP", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {},
    });
    const response = await handler(normalRequest);
    expect(response).toEqual(NO_SUCH_APPLICATION_STEP);
    expect(response.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(response.body).message).toEqual("Application Step not found for this Portfolio Draft");
  });
});

describe("when handler() can not find the given Portfolio Draft", function () {
  it("should return error response NO_SUCH_PORTFOLIO_DRAFT", async () => {
    ddbMock.on(GetCommand).resolves({});
    const response = await handler(normalRequest);
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(response.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(response.body).message).toEqual("Portfolio Draft with the given ID does not exist");
  });
});

describe("when handler() fails to service the request", function () {
  it("should return error response DATABASE_ERROR when unknown internal problem occurs", async () => {
    ddbMock.on(GetCommand).rejects({ name: "InternalServiceError" });
    const response = await handler(normalRequest);
    expect(response).toEqual(DATABASE_ERROR);
    expect(response.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body).message).toEqual("Database error");
  });
});

describe("when getApplicationStep() given a valid portfolioDraftId ", function () {
  it("should return an object that looks like an Application Step", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: mockApplicationStep,
    });
    const response = await getApplicationStep(mockPortfolioDraftId);
    expect(response.Item).toStrictEqual(mockApplicationStep);
    expect(() => {
      getApplicationStep(mockPortfolioDraftId);
    }).not.toThrow();
  });
});
