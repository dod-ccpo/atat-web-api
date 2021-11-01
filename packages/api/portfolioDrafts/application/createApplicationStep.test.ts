import { Context } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  mockApplicationStep,
  mockApplicationStepsBadData,
  mockPortfolioDraftSummary,
  mockBadPortfolioDraftSummary,
  mockApplicationsMissingFields,
  mockBadOperatorEmails,
  mockEnvironmentsMissingFields,
  badEnvironmentInApplication,
  mockOperatorMissingDisplayNameFields,
  mockOperatorMissingEmailFields,
  mockOperatorMissingAccessFields,
} from "./commonApplicationMockData";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import { ApplicationStep } from "../../models/ApplicationStep";
import { Application } from "../../models/Application";
import { AppEnvAccess } from "../../models/Operator";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { handler } from "./createApplicationStep";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: ApiGatewayEventParsed<ApplicationStep> = {
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
    const emptyRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: mockApplicationStep,
      // pathParameters { portfolioDraftId: uuidv4() }  // no pathParameters
    } as any;
    const result = await handler(emptyRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  });
  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: mockApplicationStep,
      pathParameters: { portfolioDraftId: "invalid" }, // not UUIDv4
    } as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});

describe("Request body shape validations", function () {
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
    const invalidRequest: ApiGatewayEventParsed<ApplicationStep> = badRequest as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
    expect(JSON.parse(result?.body ?? "").details[0]).toEqual({
      instancePath: "/body",
      keyword: "type",
      message: "must be object",
      params: { type: "object" },
      schemaPath: "#/properties/body/type",
    });
  });
  it("should return error when request body is not a application step", async () => {
    const emptyRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { foo: "bar" }, // valid json, but not ApplicationStep
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(emptyRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(3);
    expect(result?.body).toMatch(/"must have required property [applications|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
    JSON.parse(result?.body ?? "").details.forEach((detail: any) => {
      expect(detail.instancePath).toBe("/body");
      expect(["required", "additionalProperties"]).toContain(detail.keyword);
    });
  });
  it("should return an error when incorrect or missing application properties", async () => {
    const invalidShapeRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { applications: mockApplicationsMissingFields, operators: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(invalidShapeRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    // 5 different applications, most with missing fields and last with incorrect fields
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(5);
    expect(result?.body).toMatch(/"must have required property [name|environments|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it("should return an error when incorrect or missing environment properties", async () => {
    const badEnvironmentRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { applications: badEnvironmentInApplication, operators: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badEnvironmentRequest, {} as Context, () => null);
    JSON.parse(result?.body ?? "").details.forEach((detail: any) => {
      expect(detail.instancePath).toEqual("/body/applications/0/environments/0");
    });
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(4);
    expect(result?.body).toMatch(/"must have required property [name|operators]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it("should return an error when the incorrect or missing operators properties", async () => {
    const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: {
        applications: mockApplicationStep.applications,
        operators: [{ noName: "the dark side", noAcess: "take over the universe" }],
      },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    JSON.parse(result?.body ?? "").details.forEach((detail: any) => {
      expect(detail.instancePath).toEqual("/body/operators/0");
    });
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(5);
    expect(result?.body).toMatch(/"must have required property [display_name|email|access]/);
    expect(result?.body).toMatch(/"must NOT have additional properties"/);
  });
  it.each(mockOperatorMissingDisplayNameFields)(
    "should return an error when an operator is missing a display_name (all levels of ApplicationStep)",
    async (operatorMissingDisplayNameApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStep> = {
        body: operatorMissingDisplayNameApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
      expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
      expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
      expect(result?.body).toMatch(/"must have required property display_name"/);
    }
  );
  it.each(mockOperatorMissingEmailFields)(
    "should return an error when an operator is missing an email (all levels of ApplicationStep)",
    async (operatorMissingEmailApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStep> = {
        body: operatorMissingEmailApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
      expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
      expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
      expect(result?.body).toMatch(/"must have required property email"/);
    }
  );
  it.each(mockOperatorMissingAccessFields)(
    "should return an error when an operator is missing an access role (all levels of ApplicationStep)",
    async (operatorMissingEmailApplicationStep) => {
      const badPortfolioOperatorRequest: ApiGatewayEventParsed<ApplicationStep> = {
        body: operatorMissingEmailApplicationStep,
        pathParameters: { portfolioDraftId: uuidv4() },
      } as any;
      const result = await handler(badPortfolioOperatorRequest, {} as Context, () => null);
      expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
      expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
      expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
      expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
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
    expect(responseBody.applications.flatMap((app: Application) => app.environments)).toHaveLength(
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
    expect(responseBody.applications.flatMap((app: Application) => app.environments)).not.toHaveLength(
      mockBadPortfolioSummary.num_environments
    );
  });
});

describe("Business rules validation tests", function () {
  it("should return a validation error when application name is too short or too long", async () => {
    const badApplicationNameRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { ...mockApplicationStepsBadData[0] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badApplicationNameRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    // 2 different applications, name too short and name too long
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(2);
    JSON.parse(result?.body ?? "").details.forEach((detail: any) => {
      expect(detail.instancePath).toMatch(/\/body\/applications\/[0|1]\/name/);
      expect(detail.message).toEqual('must match pattern "^[a-zA-Z\\d _-]{4,100}$"');
      expect(detail.schemaPath).toEqual("#/properties/body/properties/applications/items/properties/name/pattern");
    });
  });
  it("should return a validation error when an environment name is too short or too long", async () => {
    const badEnvironmentNameRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { ...mockApplicationStepsBadData[1] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badEnvironmentNameRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    // 2 different environment, name too short and name too long
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(2);
    expect(JSON.parse(result?.body ?? "").details[0].message).toEqual('must match pattern "^[a-zA-Z\\d ,.-]{1,100}$"');
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments\/[0|1]\/name"/);
  });
  it("should return a validation error when an operator has a name that is too short or too long", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { ...mockApplicationStepsBadData[2] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    // 2 different operators, name too short and name too long
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(2);
    expect(JSON.parse(result?.body ?? "").details[0].message).toEqual('must match pattern "^[a-zA-Z\\d ,.-]{1,100}$"');
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments\/0\/operators\/0\/display_name"/);
    expect(result?.body).toMatch(/"\/body\/applications\/0\/operators\/0\/display_name"/);
  });
  it("should return a validation error when there is not at least 1 application", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { ...mockApplicationStep, applications: [] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
    expect(JSON.parse(result?.body ?? "").details[0].message).toEqual("must NOT have less than 1 item");
    expect(result?.body).toMatch(/\/body\/applications"/);
  });
  it("should return a validation error when there is not at least 1 environment", async () => {
    const badOperatorDisplayNameRequest: ApiGatewayEventParsed<ApplicationStep> = {
      body: { ...mockApplicationStep, applications: [{ ...mockApplicationStep.applications[0], environments: [] }] },
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(badOperatorDisplayNameRequest, {} as Context, () => null);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result?.body ?? "").message).toMatch(/Event object failed validation/);
    expect(JSON.parse(result?.body ?? "").name).toMatch(/BadRequestError/);
    // 2 different operators, name too short and name too long
    expect(JSON.parse(result?.body ?? "").details).toHaveLength(1);
    expect(JSON.parse(result?.body ?? "").details[0].message).toEqual("must NOT have less than 1 item");
    expect(result?.body).toMatch(/"\/body\/applications\/0\/environments"/);
  });
  it("should be an administrator operator at at least one level", async () => {
    // TODO: add validation for admin operators
    // 1 root admin
    // 1 admin at each app level (no root operators)
    // 1 admin each env level (no root or app operators)
  });
});

describe("Portfolio Draft DNE tests", () => {
  it("should return error response when given portfolio draft does not exist", async () => {
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
  });
});
