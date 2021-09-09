import { DynamoDBDocumentClient, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import { AccessLevel } from "../../models/AccessLevel";
import { ApplicationStep } from "../../models/ApplicationStep";
import { Environment } from "../../models/Environment";
import { ErrorCode } from "../../models/Error";
import { Operator } from "../../models/Operator";
import { DATABASE_ERROR, NO_SUCH_APPLICATION_STEP, PATH_PARAMETER_REQUIRED_BUT_MISSING } from "../../utils/errors";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { handler, NO_SUCH_PORTFOLIO_DRAFT } from "./getApplicationStep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

it("should return generic Error if exception caught", async () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  ddbMock.on(GetCommand).rejects("Some error occurred");
  const result = await handler(validRequest);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(DATABASE_ERROR);
  expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  expect(JSON.parse(result.body).code).toEqual(ErrorCode.OTHER);
});
it("should require path param", async () => {
  const emptyRequest: APIGatewayProxyEvent = {} as any;
  const result = await handler(emptyRequest);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(PATH_PARAMETER_REQUIRED_BUT_MISSING);
  expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  expect(JSON.parse(result.body).code).toEqual(ErrorCode.OTHER);
});
it("should return error when path param not UUIDv4 (to avoid performing query)", async () => {
  const invalidRequest: APIGatewayProxyEvent = {
    pathParameters: { portfolioDraftId: "invalid" },
  } as any;
  const result = await handler(invalidRequest);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  expect(JSON.parse(result.body).code).toEqual(ErrorCode.OTHER);
  expect(JSON.parse(result.body).message).toMatch(/The given Portfolio Draft does not exist/);
});
it("should return error if portfolio draft does not exist", async () => {
  const emptyOutput: GetCommandOutput = {} as any;
  ddbMock.on(GetCommand).resolves(emptyOutput);
  const result = await handler(validRequest);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  expect(JSON.parse(result.body).code).toEqual(ErrorCode.OTHER);
  expect(JSON.parse(result.body).message).toMatch(/The given Portfolio Draft does not exist/);
});
it("should return error if application step does not exist in portfolio draft", async () => {
  const itemOutput: GetCommandOutput = { Item: {} } as any;
  ddbMock.on(GetCommand).resolves(itemOutput);
  const result = await handler(validRequest);
  expect(result).toBeInstanceOf(OtherErrorResponse);
  expect(result).toEqual(NO_SUCH_APPLICATION_STEP);
  expect(result.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  expect(JSON.parse(result.body).code).toEqual(ErrorCode.OTHER);
  expect(JSON.parse(result.body).message).toMatch(/Application Step not found for this Portfolio Draft/);
});
it("should return application step", async () => {
  const appStepOutput: GetCommandOutput = { Item: { application_step: {} } } as any;
  ddbMock.on(GetCommand).resolves(appStepOutput);
  const result = await handler(validRequest);
  expect(result).toBeInstanceOf(ApiSuccessResponse);
  expect(result.statusCode).toEqual(SuccessStatusCode.OK);
  expect(result.body).toEqual(JSON.stringify({}));
});
it("should return application step with sample data", async () => {
  const fullAppStepOutput: GetCommandOutput = { Item: { application_step: mockApplicationStep() } } as any;
  ddbMock.on(GetCommand).resolves(fullAppStepOutput);
  const result = await handler(validRequest);
  expect(result.body).toStrictEqual(JSON.stringify(mockApplicationStep()));
});

/**
 * PortfolioDraftSummaryEx from API spec
 * @returns a complete ApplicationStep
 */
function mockApplicationStep(): ApplicationStep {
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
  return {
    name: "Mock Application",
    description: "The description of the Mock Application",
    environments: [mockEnvironmentCloudCity, mockEnvironmentJabbasPalace],
  };
}
