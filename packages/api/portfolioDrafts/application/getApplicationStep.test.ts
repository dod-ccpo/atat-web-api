import { AccessLevel } from "../../models/AccessLevel";
import { APIGatewayProxyEvent } from "aws-lambda";
import { ApplicationStep } from "../../models/ApplicationStep";
import { Clin } from "../../models/Clin";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Environment } from "../../models/Environment";
import { ErrorCodes } from "../../models/Error";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { FileMetadata, FileScanStatus } from "../../models/FileMetadata";
import { FundingStep } from "../../models/FundingStep";
import { getApplicationStep, handler } from "./getApplicationStep";
import { isApplicationStep } from "../../utils/validation";
import { mockClient } from "aws-sdk-client-mock";
import { Operator } from "../../models/Operator";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { PortfolioStep } from "../../models/PortfolioStep";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
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
// const mockPortfolioStep: PortfolioStep = {
//   name: "Mock Portfolio",
//   description: "Mock portfolio description",
//   dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
//   portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
// };
// const mockFileMetadata: FileMetadata = {
//   id: "1234",
//   created_at: "2021-08-03T16:21:07.978Z",
//   updated_at: "2021-08-03T16:21:07.978Z",
//   size: 100,
//   name: "Mock task order file",
//   status: FileScanStatus.PENDING,
// };
// const mockClin: Clin = {
//   clin_number: "0001",
//   idiq_clin: "1234",
//   total_clin_value: 200000,
//   obligated_funds: 10000,
//   pop_start_date: "2021-09-01",
//   pop_end_date: "2022-09-01",
// };
// const mockFundingStep: FundingStep = {
//   task_order_number: "12345678910",
//   task_order_file: mockFileMetadata,
//   csp: CloudServiceProvider.AWS,
//   clins: [mockClin],
// };
const mockApplicationStep: ApplicationStep = {
  name: "Mock Application",
  description: "The description of the Mock Application",
  environments: [mockEnvironmentCloudCity, mockEnvironmentJabbasPalace],
};
// const now = new Date();
const mockPortfolioDraftId = uuid();
// const mockPortfolioDraft: PortfolioDraft = {
//   updated_at: now.toISOString(),
//   created_at: now.toISOString(),
//   portfolio_step: mockPortfolioStep,
//   funding_step: mockFundingStep,
//   application_step: mockApplicationStep,
//   num_portfolio_managers: 1,
//   status: ProvisioningStatus.NOT_STARTED,
//   id: mockPortfolioDraftId,
// };

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
  it.todo("should return http status 404 when the given Portfolio Draft does not exist");
});

describe("when handler() does not receive required parameter 'portfolioDraftId'", function () {
  it("should return error response PATH_VARIABLE_REQUIRED_BUT_MISSING", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(response).toEqual(PATH_VARIABLE_REQUIRED_BUT_MISSING);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Required path variable is missing'", async () => {
    const response = await handler(missingPathVariableRequest);
    expect(JSON.parse(response.body).message).toEqual("Required path variable is missing");
  });
});

describe("when handler() receives an invalid 'portfolioDraftId'", function () {
  it("should return error response PATH_VARIABLE_INVALID", async () => {
    const response = await handler(invalidPathVariableRequest);
    expect(response).toEqual(PATH_VARIABLE_INVALID);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(invalidPathVariableRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(invalidPathVariableRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Invalid path variable'", async () => {
    const response = await handler(invalidPathVariableRequest);
    expect(JSON.parse(response.body).message).toEqual("Invalid path variable");
  });
});

describe("getApplicationStep()", function () {
  it("should return an object that looks like an Application Step given a valid portfolioDraftId", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: mockApplicationStep,
    });
    const response = await getApplicationStep(mockPortfolioDraftId);
    expect(response.Item).toStrictEqual(mockApplicationStep);
  });
});

describe("when handler() can not find the Application Step in the given Portfolio Draft", function () {
  it("should return error response NO_SUCH_APPLICATION_STEP", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {},
    });
    const response = await handler(normalRequest);
    expect(response).toEqual(NO_SUCH_APPLICATION_STEP);
  });
});

describe("when handler() can not find the given Portfolio Draft", function () {
  it("should return error response NO_SUCH_PORTFOLIO_DRAFT", async () => {
    ddbMock.on(GetCommand).resolves({});
    const response = await handler(normalRequest);
    expect(response).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});

describe("when handler() fails to service the request", function () {
  it("should return database error when unknown internal problem occurs", async () => {
    ddbMock.on(GetCommand).rejects({ name: "InternalServiceError" });
    const data = await handler(normalRequest);
    expect(data).toEqual(DATABASE_ERROR);
  });
});
