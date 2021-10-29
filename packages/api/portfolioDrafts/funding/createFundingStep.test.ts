import { APIGatewayProxyEvent } from "aws-lambda";
import { createValidationErrorResponse, handler, validateClin, validateFundingStepClins } from "./createFundingStep";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { isFundingStep } from "../../utils/validation";
import { mockClient } from "aws-sdk-client-mock";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { ValidationMessage } from "../../models/FundingStep";
import {
  ApiSuccessResponse,
  ErrorStatusCode,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../../utils/response";
import {
  REQUEST_BODY_EMPTY,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  REQUEST_BODY_INVALID,
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
} from "../../utils/errors";
import {
  millisInDay,
  mockClinAlreadyEnded,
  mockClinArrayBadData,
  mockClinArrayGoodData,
  mockClinInvalidClinNumberAllZeros,
  mockClinInvalidClinNumberTooLong,
  mockClinInvalidClinNumberTooShort,
  mockClinInvalidDates,
  mockClinLessThanZeroFunds,
  mockClinNotANumberFunds,
  mockClinObligatedEqualsTotal,
  mockClinObligatedGreaterThanTotal,
  mockClinStartAfterEnd,
  mockClinStartEqualsEnd,
  mockClinZeroFunds,
  mockFundingStep,
  mockFundingStepBadData,
  now,
  today,
  tomorrow,
  yesterday,
} from "./commonFundingMockData";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(mockFundingStep),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

const validRequestBadData: APIGatewayProxyEvent = {
  body: JSON.stringify(mockFundingStepBadData),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

it("sanity check; relative dates used for tests should make sense", () => {
  expect(new Date(yesterday).valueOf() + millisInDay).toEqual(new Date(today).valueOf());
  expect(new Date(today).valueOf() + millisInDay).toEqual(new Date(tomorrow).valueOf());
});

describe("Handle service level error", () => {
  it("should return generic Error if exception caught", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    ddbMock.on(UpdateCommand).rejects("Some error occurred");
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(DATABASE_ERROR);
    expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe("Path parameter tests", () => {
  it("should require path param", async () => {
    const emptyRequest: APIGatewayProxyEvent = {} as any;
    const result = await handler(emptyRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(PATH_PARAMETER_REQUIRED_BUT_MISSING);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: APIGatewayProxyEvent = {
      pathParameters: { portfolioDraftId: "invalid" },
    } as any;
    const result = await handler(invalidRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result.body).message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});

describe("Request body tests", () => {
  it("should return error when request body is empty", async () => {
    const emptyRequest: APIGatewayProxyEvent = {
      body: "",
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
  it("should return error when request body is not a funding step", async () => {
    const notFundingStepRequest: APIGatewayProxyEvent = {
      body: JSON.stringify({ foo: "bar" }), // valid json
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    expect(isFundingStep(mockFundingStep)).toEqual(true); // control
    expect(isFundingStep(notFundingStepRequest)).toEqual(false);
    const result = await handler(notFundingStepRequest);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).message).toMatch(/A valid request body must be provided/);
  });
});

describe("Successful operation tests", () => {
  it("should return funding step and http status code 201", async () => {
    const now = new Date().toISOString();
    const mockResponse = {
      updated_at: now,
      created_at: now,
      funding_step: mockFundingStep,
      num_task_orders: 1,
      status: ProvisioningStatus.NOT_STARTED,
      id: uuidv4(),
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const fundingStepOutput: UpdateCommandOutput = {
      Attributes: { funding_step: JSON.stringify(mockFundingStep) },
    } as any;
    ddbMock.on(UpdateCommand).resolves(fundingStepOutput);
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result.body).toStrictEqual(JSON.stringify(mockFundingStep));
    const numOfTaskOrders = JSON.parse(result.body).task_orders.length;
    expect(numOfTaskOrders).toBe(mockResponse.num_task_orders);
  });
});

describe("Incorrect number of task orders", () => {
  it("should return falsy due to incorrect number of task orders", async () => {
    const mockResponse = {
      updated_at: now,
      created_at: now,
      funding_step: mockFundingStep,
      num_task_orders: 3,
      status: ProvisioningStatus.NOT_STARTED,
      id: uuidv4(),
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const result = await handler(validRequest);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.task_orders.length === mockResponse.num_task_orders).toBeFalsy();
  });
});

describe("Individual Clin input validation tests", () => {
  it("should throw error if input does not look like a Clin", () => {
    expect(() => {
      validateClin({});
    }).toThrow(Error("Input must be a Clin object"));
  });
  it.each(mockClinArrayGoodData)("should return empty error map for each Clin with good data", (goodDataClin) => {
    const errors = validateClin(goodDataClin);
    expect(errors.length).toEqual(0);
    expect(errors).toStrictEqual([]);
  });
  it.each(mockClinArrayBadData)("should return non-empty error map for each Clin with bad data", (badDataClin) => {
    const errors = validateClin(badDataClin);
    expect(errors.length).not.toEqual(0);
    expect(errors).not.toStrictEqual([]);
  });
  it("should return error map entries when given Clin has invalid start and end dates", () => {
    const errors = validateClin(mockClinInvalidDates);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_start_date",
      invalidParameterValue: "not an ISO date",
      validationMessage: ValidationMessage.START_VALID,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: "2021-13-01",
      validationMessage: ValidationMessage.END_VALID,
    });
  });
  it("should return error map entries when given Clin has invalid pop dates (start>end)", () => {
    const errors = validateClin(mockClinStartAfterEnd);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_start_date",
      invalidParameterValue: tomorrow,
      validationMessage: ValidationMessage.START_BEFORE_END,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: today,
      validationMessage: ValidationMessage.START_BEFORE_END,
    });
  });
  it("should return error map entries when given Clin has invalid pop dates (start=end)", () => {
    const errors = validateClin(mockClinStartEqualsEnd);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_start_date",
      invalidParameterValue: today,
      validationMessage: ValidationMessage.START_BEFORE_END,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: today,
      validationMessage: ValidationMessage.START_BEFORE_END,
    });
  });
  it("should return error map entries when given Clin has invalid pop dates (now>end)", () => {
    const errors = validateClin(mockClinAlreadyEnded);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: yesterday,
      validationMessage: ValidationMessage.END_FUTURE,
    });
  });
  it("should return error map entries when given Clin has invalid funding amounts (not numbers)", () => {
    const errors = validateClin(mockClinNotANumberFunds);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "not a number",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "not a number",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
  });
  it("should return error map entries when given Clin has invalid funding amounts (total<0, obligated<0)", () => {
    const errors = validateClin(mockClinLessThanZeroFunds);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "-1",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "-1",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
  });
  it("should return error map entries when given Clin has invalid funding amounts (total=0, obligated=0)", () => {
    const errors = validateClin(mockClinZeroFunds);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "0",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "0",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
  });
  it("should return error map entries when given Clin has invalid funding amounts (obligated>total)", () => {
    const errors = validateClin(mockClinObligatedGreaterThanTotal);
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "2",
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "1",
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
    });
  });
  it("should return error map entries when given Clin has invalid clin number (<4char)", () => {
    const errors = validateClin(mockClinInvalidClinNumberTooShort);
    expect(errors).toContainEqual({
      clinNumber: "1",
      invalidParameterName: "clin_number",
      invalidParameterValue: "1",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
  });
  it("should return error map entries when given Clin has invalid clin number (>4char)", () => {
    const errors = validateClin(mockClinInvalidClinNumberTooLong);
    expect(errors).toContainEqual({
      clinNumber: "55555",
      invalidParameterName: "clin_number",
      invalidParameterValue: "55555",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
  });
  it("should return error map entries when given Clin has invalid clin number (all 0s)", () => {
    const errors = validateClin(mockClinInvalidClinNumberAllZeros);
    expect(errors).toContainEqual({
      clinNumber: "0000",
      invalidParameterName: "clin_number",
      invalidParameterValue: "0000",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
  });
  it("should return no error map entries when given Clin has these funding values (obligated=total)", () => {
    const errors = validateClin(mockClinObligatedEqualsTotal);
    expect(errors).toStrictEqual([]);
  });
});

describe("All Clins in Funding Step input validation tests", () => {
  it("should accept a Funding Step and validate all Clins contained therein", () => {
    const errors = validateFundingStepClins(mockFundingStepBadData);
    expect(errors.length).toEqual(20);
    expect(errors).toContainEqual({
      clinNumber: "1",
      invalidParameterName: "clin_number",
      invalidParameterValue: "1",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
    expect(errors).toContainEqual({
      clinNumber: "0000",
      invalidParameterName: "clin_number",
      invalidParameterValue: "0000",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
    expect(errors).toContainEqual({
      clinNumber: "55555",
      invalidParameterName: "clin_number",
      invalidParameterValue: "55555",
      validationMessage: ValidationMessage.INVALID_CLIN_NUMBER,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_start_date",
      invalidParameterValue: "not an ISO date",
      validationMessage: ValidationMessage.START_VALID,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: "2021-13-01",
      validationMessage: ValidationMessage.END_VALID,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.START_BEFORE_END,
      invalidParameterName: "pop_start_date",
      invalidParameterValue: tomorrow,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.START_BEFORE_END,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: today,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: today,
      validationMessage: ValidationMessage.END_FUTURE,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.START_BEFORE_END,
      invalidParameterName: "pop_start_date",
      invalidParameterValue: yesterday,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.START_BEFORE_END,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: yesterday,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: yesterday,
      validationMessage: ValidationMessage.END_FUTURE,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "0",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "0",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "2",
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "1",
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
      invalidParameterName: "total_clin_value",
      invalidParameterValue: "-1",
    });
    expect(errors).toContainEqual({
      clinNumber: "0001",
      validationMessage: ValidationMessage.INVALID_FUNDING_AMOUNT,
      invalidParameterName: "obligated_funds",
      invalidParameterValue: "-1",
    });
  });
});

describe("Error response creation tests", () => {
  it("should return error response that includes error_map in response body", () => {
    const obj = { errors: { propertyA: "property_value", propertyB: "property_value" } };
    const invalidProperties: Record<string, unknown> = obj;
    const response = createValidationErrorResponse(invalidProperties);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(JSON.parse(response.body).message).toMatch(/Invalid input/);
    expect(JSON.parse(response.body).error_map).toEqual(obj);
  });
  it("should return error response containing all invalid properties in error_map", async () => {
    const result = await handler(validRequestBadData);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(JSON.parse(result.body).message).toMatch(/Invalid input/);
  });
  it("should throw error if invalid properties input is empty", () => {
    const emptyInvalidProperties: Record<string, unknown> = {};
    expect(() => {
      createValidationErrorResponse(emptyInvalidProperties);
    }).toThrow(Error("Parameter 'invalidProperties' must not be empty"));
  });
  it("should throw error if invalid properties input has empty string as key", () => {
    const emptyStringKeyInvalidProperties: Record<string, unknown> = {
      "": { propertyA: "property_value", propertyB: "property_value" },
    };
    expect(() => {
      createValidationErrorResponse(emptyStringKeyInvalidProperties);
    }).toThrow(Error("Parameter 'invalidProperties' must not have empty string as key"));
  });
});
