import { APIGatewayProxyEvent } from "aws-lambda";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../../utils/response";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { handler, validateApplication, validateEnvironment } from "./createApplicationStep";
import { isApplicationStep } from "../../utils/validation";
import { mockApplicationStep, mockApplicationStepsBadData } from "./commonMockData";
import { mockClient } from "aws-sdk-client-mock";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import {
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  REQUEST_BODY_EMPTY,
  REQUEST_BODY_INVALID,
} from "../../utils/errors";
import { ValidationMessage } from "../../models/ApplicationStep";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(mockApplicationStep),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

describe("Handle service level error", function () {
  it("should return generic Error if exception caught", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    ddbMock.on(UpdateCommand).rejects("Some error occurred");
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(DATABASE_ERROR);
    expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe("Path parameter tests", function () {
  it("should require path param", async () => {
    const emptyRequest: APIGatewayProxyEvent = {} as any; // no pathParameters
    const result = await handler(emptyRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(PATH_PARAMETER_REQUIRED_BUT_MISSING);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: APIGatewayProxyEvent = {
      pathParameters: { portfolioDraftId: "invalid" }, // not UUIDv4
    } as any;
    const result = await handler(invalidRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result.body).message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});

describe("Request body tests", function () {
  it("should return error when request body is empty", async () => {
    const emptyRequest: APIGatewayProxyEvent = {
      body: "", // empty body
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(emptyRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(REQUEST_BODY_EMPTY);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toMatch(/Request body must not be empty/);
  });
  it("should return error when request body is invalid json", async () => {
    const invalidBodyRequest: APIGatewayProxyEvent = {
      body: JSON.stringify({ foo: "bar" }) + "}", // invalid json
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(invalidBodyRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toMatch(/A valid request body must be provided/);
  });
  it("should return error when request body is not a application step", async () => {
    const notApplicationStepRequest: APIGatewayProxyEvent = {
      body: JSON.stringify({ foo: "bar" }), // valid json, but not ApplicationStep
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    expect(isApplicationStep(mockApplicationStep)).toEqual(true); // control
    expect(isApplicationStep(notApplicationStepRequest)).toEqual(false);
    const result = await handler(notApplicationStepRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toMatch(/A valid request body must be provided/);
  });
});

describe("Successful operation tests", function () {
  it("should return application step and http status code 201", async () => {
    const now = new Date().toISOString();
    const mockResponse = {
      updated_at: now,
      created_at: now,
      application_step: mockApplicationStep,
      num_portfolio_managers: 0,
      status: ProvisioningStatus.NOT_STARTED,
      id: uuidv4(),
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const applicationStepOutput: UpdateCommandOutput = {
      Attributes: { application_step: JSON.stringify(mockApplicationStep) },
    } as any;
    ddbMock.on(UpdateCommand).resolves(applicationStepOutput);
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result.body).toStrictEqual(JSON.stringify(mockApplicationStep));
  });
});

describe("Individual Application input validation tests", function () {
  it("should throw error if input does not look like an Application", () => {
    expect(() => {
      validateApplication({});
    }).toThrow(Error("Input must be an Application object"));
  });
  it("should return no error map entries when given Application has good data", () => {
    const allerrors = mockApplicationStep.applications
      .map(validateApplication)
      .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
    expect(allerrors).toStrictEqual([]);
  });
  it("should return error map entries when given Application has a name that is too short", () => {
    const errors = validateApplication(mockApplicationStepsBadData[0].applications[0]);
    expect(errors.length).toEqual(1);
    const tooShortName = "abc";
    expect(errors).toContainEqual({
      applicationName: tooShortName,
      invalidParameterName: "name",
      invalidParameterValue: tooShortName,
      validationMessage: ValidationMessage.INVALID_APPLICATION_NAME,
    });
  });
  it("should return error map entries when given Application has a name that is too long", () => {
    const errors = validateApplication(mockApplicationStepsBadData[1].applications[0]);
    expect(errors.length).toEqual(1);
    const tooLongName =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.";
    expect(errors).toContainEqual({
      applicationName: tooLongName,
      invalidParameterName: "name",
      invalidParameterValue: tooLongName,
      validationMessage: ValidationMessage.INVALID_APPLICATION_NAME,
    });
  });
  it("should return error map entries when given Application has an Environment with a name that is too short", () => {
    const errors = validateEnvironment(mockApplicationStepsBadData[2].applications[0].environments[0]);
    expect(errors.length).toEqual(1);
    const tooShortName = "abc";
    expect(errors).toContainEqual({
      applicationName: tooShortName,
      invalidParameterName: "name",
      invalidParameterValue: tooShortName,
      validationMessage: ValidationMessage.INVALID_ENVIRONMENT_NAME,
    });
  });
  it("should return error map entries when given Application has an Environment with a name that is too long", () => {
    const errors = validateEnvironment(mockApplicationStepsBadData[3].applications[0].environments[0]);
    expect(errors.length).toEqual(1);
    const tooLongName =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend lectus ut luctus ultricies nisi.";
    expect(errors).toContainEqual({
      applicationName: tooLongName,
      invalidParameterName: "name",
      invalidParameterValue: tooLongName,
      validationMessage: ValidationMessage.INVALID_ENVIRONMENT_NAME,
    });
  });
});

// // NOTE: consider moving this to a shared location so that other tests can use it
// const emptyEvent: APIGatewayProxyEvent = {
//   body: "",
//   headers: {},
//   httpMethod: "",
//   isBase64Encoded: false,
//   path: "",
//   pathParameters: {},
//   queryStringParameters: null,
//   stageVariables: {},
//   requestContext: {} as never,
//   resource: "",
//   multiValueHeaders: {},
//   multiValueQueryStringParameters: {},
// };

// describe("Portfolio Draft DNE tests", () => {
//   it.todo("should return PATH_PARAMETER_REQUIRED_BUT_MISSING if no path param");

//   it("should return status code 404 & error body with message 'Portfolio Draft with the given ID does not exist'", async () => {
//     ddbMock.on(UpdateCommand).rejects({
//       name: "ConditionalCheckFailedException",
//     });
//     const request = cloneDeep(emptyEvent);
//     request.pathParameters = { portfolioDraftId: "invalid" };
//     request.body = JSON.stringify(applicationStepMinimal);

//     const result = await handler(request);
//     expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
//   });
// });
