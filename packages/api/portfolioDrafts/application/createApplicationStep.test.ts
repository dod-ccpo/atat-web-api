/* eslint-disable camelcase */
import { Context } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  mockApplicationStep,
  mockApplicationStepsBadData,
  mockPortfolioDraftSummary,
  mockBadPortfolioDraftSummary,
  mockApplicationsMissingFields,
  badEnvironmentInApplication,
  mockOperatorMissingDisplayNameFields,
  mockOperatorMissingEmailFields,
  mockOperatorMissingAccessFields,
  mockApplicationsStepWithGoodAdminRoles,
  mockApplicationsStepWithBadAdminRoles,
  mockBadApplicationDescriptions,
} from "./commonApplicationMockData";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import { ApplicationStepModel } from "../../models/ApplicationStep";
import { ApplicationModel } from "../../models/Application";
import {
  ApiSuccessResponse,
  ErrorStatusCode,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../../utils/response";
import { handler } from "./createApplicationStep";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT_404 } from "../../utils/errors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { findAdministrators } from "../../utils/requestValidation";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
  body: mockApplicationStep,
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

describe("Handle service level error", () => {
  it("should return generic Error if exception caught", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    ddbMock.on(UpdateCommand).rejects("Some error occurred");
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(DATABASE_ERROR);
    expect(result?.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe("Path parameter tests", () => {
  it("should require path param", async () => {
    const emptyRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: mockApplicationStep,
      // pathParameters { portfolioDraftId: uuidv4() }  // no pathParameters
    } as any;
    const result = await handler(emptyRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  });
  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: mockApplicationStep,
      pathParameters: { portfolioDraftId: "invalid" }, // not UUIDv4
    } as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});

describe("Request body shape validations", () => {
  it.each([
    {
      body: "", // empty body
      pathParameters: { portfolioDraftId: uuidv4() },
    },
    {
      body: JSON.stringify({ foo: "bar" }) + "}", // invalid json
      pathParameters: { portfolioDraftId: uuidv4() },
    },
  ])("should return an error when the request body is empty or invalid json", async (badRequest) => {
    const invalidRequest: ApiGatewayEventParsed<ApplicationStepModel> = badRequest as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.error_map).toHaveLength(1);
    expect(responseBody.error_map[0]).toEqual({
      instancePath: "/body",
      keyword: "type",
      message: "must be object",
      params: { type: "object" },
      schemaPath: "#/properties/body/type",
    });
  });
  it("should return error when request body is not a application step", async () => {
    const emptyRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { foo: "bar" }, // valid json, but not ApplicationStep
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(emptyRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.error_map).toHaveLength(3);
    expect(result?.body).toMatch(/"must have required property [applications|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
    responseBody.error_map.forEach((error_map: any) => {
      expect(error_map.instancePath).toBe("/body");
      expect(["required", "additionalProperties"]).toContain(error_map.keyword);
    });
  });
  it("should return an error when incorrect or missing application properties", async () => {
    const invalidShapeRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { applications: mockApplicationsMissingFields, operators: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(invalidShapeRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    // 5 different applications, most with missing fields and last with incorrect fields
    expect(responseBody.error_map).toHaveLength(5);
    expect(result?.body).toMatch(/"must have required property [name|environments|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it("should return an error when application description is too long (max 300) or invalid special chars", async () => {
    const badApplicationDescriptionsRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: mockBadApplicationDescriptions,
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badApplicationDescriptionsRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.error_map).toHaveLength(2);
    expect(responseBody.error_map[0].message).toEqual('must match pattern "^[\\w\\d !@#$%^&*_|:;,\'.-]{0,300}$"');
    expect(responseBody.error_map[0].instancePath).toEqual("/body/applications/1/description");
    expect(responseBody.error_map[1].instancePath).toEqual("/body/applications/2/description");
  });
  it("should return an error when incorrect or missing environment properties", async () => {
    const badEnvironmentRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { applications: badEnvironmentInApplication, operators: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badEnvironmentRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    responseBody.error_map.forEach((error_map: any) => {
      expect(error_map.instancePath).toEqual("/body/applications/0/environments/0");
    });
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.error_map).toHaveLength(4);
    expect(result?.body).toMatch(/"must have required property [name|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it("should return an error when the incorrect or missing operators properties", async () => {
    const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: {
        applications: mockApplicationStep.applications,
        operators: [{ noName: "the dark side", noAcess: "take over the universe" }],
      },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    responseBody.error_map.forEach((error_map: any) => {
      expect(error_map.instancePath).toEqual("/body/operators/0");
    });
    expect(responseBody.error_map).toHaveLength(5);
    expect(result?.body).toMatch(/"must have required property [display_name|email|access]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it.each(mockOperatorMissingDisplayNameFields)(
    "should return an error when an operator is missing a display_name (all levels of ApplicationStep)",
    async (operatorMissingDisplayNameApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
        body: operatorMissingDisplayNameApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      const responseBody = JSON.parse(result?.body ?? "");
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(responseBody.message).toMatch(/Request failed validation/);
      expect(responseBody.code).toMatch(/INVALID_INPUT/);
      expect(result).toBeInstanceOf(ValidationErrorResponse);
      expect(responseBody.error_map).toHaveLength(1);
      expect(result?.body).toMatch(/"must have required property display_name"/);
    }
  );
  it.each(mockOperatorMissingEmailFields)(
    "should return an error when an operator is missing an email (all levels of ApplicationStep)",
    async (operatorMissingEmailApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
        body: operatorMissingEmailApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      const responseBody = JSON.parse(result?.body ?? "");
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(responseBody.message).toMatch(/Request failed validation/);
      expect(responseBody.code).toMatch(/INVALID_INPUT/);
      expect(result).toBeInstanceOf(ValidationErrorResponse);
      expect(responseBody.error_map).toHaveLength(1);
      expect(result?.body).toMatch(/"must have required property email"/);
    }
  );
  it.each(mockOperatorMissingAccessFields)(
    "should return an error when an operator is missing an access role (all levels of ApplicationStep)",
    async (operatorMissingEmailApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
        body: operatorMissingEmailApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      const responseBody = JSON.parse(result?.body ?? "");
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(responseBody.message).toMatch(/Request failed validation/);
      expect(responseBody.code).toMatch(/INVALID_INPUT/);
      expect(result).toBeInstanceOf(ValidationErrorResponse);
      expect(responseBody.error_map).toHaveLength(1);
      expect(result?.body).toMatch(/"must have required property access"/);
    }
  );
});

describe("Successful operation tests", () => {
  it("should return application step and http status code 201", async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockApplicationStep,
    });
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result?.body ?? "").toStrictEqual(JSON.stringify(mockApplicationStep));
  });
  it("should have correct number of applications and environments", async () => {
    const mockResponseGoodPortfolioSummary = mockPortfolioDraftSummary;
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponseGoodPortfolioSummary,
    });
    const result = await handler(validRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(responseBody.applications).toHaveLength(mockResponseGoodPortfolioSummary.num_applications);
    expect(responseBody.applications.flatMap((app: ApplicationModel) => app.environments)).toHaveLength(
      mockResponseGoodPortfolioSummary.num_environments
    );
  });
});

describe("Incorrect number of applications and environments", () => {
  it("should have incorrect number of applications and environments false", async () => {
    const mockBadPortfolioSummary = mockBadPortfolioDraftSummary;
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockApplicationStepsBadData,
    });
    const result = await handler(validRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(responseBody.applications).not.toHaveLength(mockBadPortfolioSummary.num_applications);
    expect(responseBody.applications.flatMap((app: ApplicationModel) => app.environments)).not.toHaveLength(
      mockBadPortfolioSummary.num_environments
    );
  });
});

describe("Business rules validation tests", () => {
  it("should return a validation error when application name is too short or too long", async () => {
    const badApplicationNameRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { ...mockApplicationStepsBadData[0] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badApplicationNameRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    // 2 different applications, name too short and name too long
    expect(responseBody.error_map).toHaveLength(2);
    responseBody.error_map.forEach((error_map: any) => {
      expect(error_map.instancePath).toMatch(/\/body\/applications\/[0|1]\/name/);
      expect(error_map.message).toEqual('must match pattern "^[a-zA-Z\\d _-]{4,100}$"');
      expect(error_map.schemaPath).toEqual("#/properties/body/properties/applications/items/properties/name/pattern");
    });
  });
  it("should return a validation error when an environment name is too short or too long", async () => {
    const badEnvironmentNameRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { ...mockApplicationStepsBadData[1] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badEnvironmentNameRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    // 2 different environment, name too short and name too long
    expect(responseBody.error_map).toHaveLength(2);
    expect(responseBody.error_map[0].message).toEqual('must match pattern "^[a-zA-Z\\d _-]{1,100}$"');
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments\/[0|1]\/name"/);
  });
  it("should return a validation error when an operator has a name that is too short or too long", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { ...mockApplicationStepsBadData[2] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    // 2 different operators, name too short and name too long
    expect(responseBody.error_map).toHaveLength(2);
    expect(responseBody.error_map[0].message).toEqual('must match pattern "^[a-zA-Z\\d ,.-]{1,100}$"');
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments\/0\/operators\/0\/display_name"/);
    expect(result?.body).toMatch(/"\/body\/applications\/0\/operators\/0\/display_name"/);
  });
  it("should return a validation error when there is not at least 1 application", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { ...mockApplicationStep, applications: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.error_map).toHaveLength(1);
    expect(responseBody.error_map[0].message).toEqual("must NOT have less than 1 item");
    expect(result?.body).toMatch(/\/body\/applications"/);
  });
  it("should return a validation error when there is not at least 1 environment", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: { ...mockApplicationStep, applications: [{ ...mockApplicationStep.applications[0], environments: [] }] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    // 2 different operators, name too short and name too long
    expect(responseBody.error_map).toHaveLength(1);
    expect(responseBody.error_map[0].message).toEqual("must NOT have less than 1 item");
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments"/);
  });
  // TODO(AT-?): move to new operation that is implemented for Step 4 with adding operators
  it.skip("should return a validation error when admin roles are not acceptable", async () => {
    const badAdminRolesRequest: ApiGatewayEventParsed<ApplicationStepModel> = {
      body: mockApplicationsStepWithBadAdminRoles[0],
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badAdminRolesRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(responseBody.message).toMatch(/Invalid admin roles/);
    expect(responseBody.error_map).toEqual({
      acceptableAdministratorRoles: false,
      applicationsWithNoAdmin: [0, 1],
      environmentsWithNoAdmin: [
        { appIndex: 0, envIndex: 0 },
        { appIndex: 1, envIndex: 0 },
      ],
      hasAdminForEachApplication: false,
      hasAdminForEachEnvironment: false,
      hasPortfolioAdminRole: false,
    });
  });
});

describe("findAdministrators", () => {
  /**
   * Acceptable admin roles in an application step according to the business rules:
   * - 1 root portfolio admin role
   * - 1 application admin role for each application (without a portfolio admin role above)
   * - 1 environment admin role for each environment (without a portfolio or application admin role above)
   */
  it("should return acceptable admin role for at each level", async () => {
    const administratorsFound = findAdministrators(mockApplicationsStepWithGoodAdminRoles[0]);
    expect(administratorsFound.hasPortfolioAdminRole).toBeTruthy();
    expect(administratorsFound.hasAdminForEachApplication).toBeTruthy();
    expect(administratorsFound.hasAdminForEachEnvironment).toBeTruthy();
    expect(administratorsFound.applicationsWithNoAdmin).toHaveLength(0);
    expect(administratorsFound.environmentsWithNoAdmin).toHaveLength(0);
    expect(administratorsFound.acceptableAdministratorRoles).toBeTruthy();
  });
  it("should return acceptable admin role for at both app and env level", async () => {
    const administratorsFound = findAdministrators(mockApplicationsStepWithGoodAdminRoles[1]);
    expect(administratorsFound.hasPortfolioAdminRole).toBeFalsy();
    expect(administratorsFound.hasAdminForEachApplication).toBeTruthy();
    expect(administratorsFound.hasAdminForEachEnvironment).toBeTruthy();
    expect(administratorsFound.applicationsWithNoAdmin).toHaveLength(0);
    expect(administratorsFound.environmentsWithNoAdmin).toHaveLength(0);
    expect(administratorsFound.acceptableAdministratorRoles).toBeTruthy();
  });
  it("should return acceptable admin role with one at the app level and remainder at env level", async () => {
    const administratorsFound = findAdministrators(mockApplicationsStepWithGoodAdminRoles[2]);
    expect(administratorsFound.hasPortfolioAdminRole).toBeFalsy();
    expect(administratorsFound.hasAdminForEachApplication).toBeFalsy();
    expect(administratorsFound.hasAdminForEachEnvironment).toBeFalsy();
    expect(administratorsFound.applicationsWithNoAdmin).toEqual([1]);
    expect(administratorsFound.environmentsWithNoAdmin).toEqual([{ appIndex: 0, envIndex: 0 }]);
    expect(administratorsFound.acceptableAdministratorRoles).toBeTruthy();
  });
  it("should return missing admin roles at all levels", async () => {
    const administratorsFound = findAdministrators(mockApplicationsStepWithBadAdminRoles[0]);
    expect(administratorsFound.hasPortfolioAdminRole).toBeFalsy();
    expect(administratorsFound.hasAdminForEachApplication).toBeFalsy();
    expect(administratorsFound.hasAdminForEachEnvironment).toBeFalsy();
    expect(administratorsFound.applicationsWithNoAdmin).toEqual([0, 1]);
    expect(administratorsFound.environmentsWithNoAdmin).toEqual([
      { appIndex: 0, envIndex: 0 },
      { appIndex: 1, envIndex: 0 },
    ]);
    expect(administratorsFound.acceptableAdministratorRoles).toBeFalsy();
  });
  it("should return missing admin role at one env with no root or app admin role ", async () => {
    const administratorsFound = findAdministrators(mockApplicationsStepWithBadAdminRoles[1]);
    expect(administratorsFound.hasPortfolioAdminRole).toBeFalsy();
    expect(administratorsFound.hasAdminForEachApplication).toBeFalsy();
    expect(administratorsFound.hasAdminForEachEnvironment).toBeFalsy();
    expect(administratorsFound.applicationsWithNoAdmin).toEqual([1, 2]);
    expect(administratorsFound.environmentsWithNoAdmin).toEqual([
      { appIndex: 0, envIndex: 0 },
      { appIndex: 2, envIndex: 1 },
    ]);
    expect(administratorsFound.acceptableAdministratorRoles).toBeFalsy();
  });
});

describe("Portfolio Draft DNE tests", () => {
  it("should return error response when given portfolio draft does not exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT_404);
  });
});
