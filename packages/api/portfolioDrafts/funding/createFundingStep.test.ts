import { APIGatewayProxyEvent } from "aws-lambda";
import { Clin } from "../../models/Clin";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { createValidationErrorResponse, handler, validateClin, validateFundingStepClins } from "./createFundingStep";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { ErrorCodes } from "../../models/Error";
import { FileMetadata, FileScanStatus } from "../../models/FileMetadata";
import { FundingStep, ValidationMessages } from "../../models/FundingStep";
import { isFundingStep } from "../../utils/validation";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import {
  ApiSuccessResponse,
  ErrorResponse,
  ErrorStatusCode,
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
import { ProvisioningStatus } from "../../models/ProvisioningStatus";

const millisInDay = 24 * 60 * 60 * 1000;
const now = Date.now();
const isoFormatDay = (base: number, offset = 0) => new Date(base + offset).toISOString().slice(0, 10);
const yesterday = isoFormatDay(now, -millisInDay);
const today = isoFormatDay(now);
const tomorrow = isoFormatDay(now, millisInDay);

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(mockFundingStepGoodData()),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

const validRequestBadData: APIGatewayProxyEvent = {
  body: JSON.stringify(mockFundingStepBadData()),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

it("sanity check; relative dates used for tests should make sense", () => {
  expect(new Date(yesterday).valueOf() + millisInDay).toEqual(new Date(today).valueOf());
  expect(new Date(today).valueOf() + millisInDay).toEqual(new Date(tomorrow).valueOf());
});

describe("Handle service level error", function () {
  it("should return generic Error if exception caught", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    ddbMock.on(UpdateCommand).rejects("Some error occurred");
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(DATABASE_ERROR);
    expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
  });
});

describe("Path parameter tests", function () {
  it("should require path param", async () => {
    const emptyRequest: APIGatewayProxyEvent = {} as any;
    const result = await handler(emptyRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(PATH_PARAMETER_REQUIRED_BUT_MISSING);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
  });
  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: APIGatewayProxyEvent = {
      pathParameters: { portfolioDraftId: "invalid" },
    } as any;
    const result = await handler(invalidRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
    expect(JSON.parse(result.body).message).toMatch(/Portfolio Draft with the given ID does not exist/);
  });
});

describe("Request body tests", function () {
  it("should return error when request body is empty", async () => {
    const emptyRequest: APIGatewayProxyEvent = {
      body: "",
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(emptyRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(REQUEST_BODY_EMPTY);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
    expect(JSON.parse(result.body).message).toMatch(/Request body must not be empty/);
  });
  it("should return error when request body is invalid json", async () => {
    const invalidBodyRequest: APIGatewayProxyEvent = {
      body: JSON.stringify({ foo: "bar" }) + "}", // invalid json
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(invalidBodyRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
    expect(JSON.parse(result.body).message).toMatch(/A valid request body must be provided/);
  });
  it("should return error when request body is not a funding step", async () => {
    const notFundingStepRequest: APIGatewayProxyEvent = {
      body: JSON.stringify({ foo: "bar" }), // valid json
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    expect(isFundingStep(mockFundingStepGoodData())).toEqual(true); // control
    expect(isFundingStep(notFundingStepRequest)).toEqual(false);
    const result = await handler(notFundingStepRequest);
    expect(result).toBeInstanceOf(ErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
    expect(JSON.parse(result.body).message).toMatch(/A valid request body must be provided/);
  });
});

describe("Successful operation tests", function () {
  it("should return funding step and http status code 201", async () => {
    const now = new Date().toISOString();
    const mockResponse = {
      updated_at: now,
      created_at: now,
      portfolio_step: mockFundingStepGoodData(),
      num_portfolio_managers: 0,
      status: ProvisioningStatus.NOT_STARTED,
      id: uuidv4(),
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const fundingStepOutput: UpdateCommandOutput = {
      Attributes: { funding_step: JSON.stringify(mockFundingStepGoodData()) },
    } as any;
    ddbMock.on(UpdateCommand).resolves(fundingStepOutput);
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result.body).toStrictEqual(JSON.stringify(mockFundingStepGoodData()));
  });
});

describe("Individual Clin input validation tests", function () {
  it("should throw error if input does not look like a Clin", () => {
    expect(() => {
      validateClin({});
    }).toThrow(Error("Input must be a Clin object"));
  });
  it("should return no error map entries when given Clin has good data", () => {
    expect(validateClin(mockClin())).toStrictEqual([]);
  });
  it("should return error map entries when given Clin has invalid start and end dates", () => {
    const errors = validateClin(mockClinInvalidDates());
    expect(errors).toContainEqual(["0001", "pop_start_date", "not an ISO date", ValidationMessages.START_VALID]);
    expect(errors).toContainEqual(["0001", "pop_end_date", "2021-13-01", ValidationMessages.END_VALID]);
  });
  it("should return error map entries when given Clin has nonsensical pop dates (start>end)", () => {
    const errors = validateClin(mockClinStartAfterEnd());
    expect(errors).toContainEqual(["0001", "pop_start_date", tomorrow, ValidationMessages.START_BEFORE_END]);
    expect(errors).toContainEqual(["0001", "pop_end_date", today, ValidationMessages.START_BEFORE_END]);
  });
  it("should return error map entries when given Clin has nonsensical pop dates (start=end)", () => {
    const errors = validateClin(mockClinStartEqualsEnd());
    expect(errors).toContainEqual(["0001", "pop_start_date", today, ValidationMessages.START_BEFORE_END]);
    expect(errors).toContainEqual(["0001", "pop_end_date", today, ValidationMessages.START_BEFORE_END]);
  });
  it("should return error map entries when given Clin has nonsensical pop dates (now>end)", () => {
    const errors = validateClin(mockClinAlreadyEnded());
    expect(errors).toContainEqual(["0001", "pop_end_date", yesterday, ValidationMessages.END_FUTURE]);
  });
  it("should return error map entries when given Clin has nonsensical funding values (total<0, obligated<0)", () => {
    const errors = validateClin(mockClinLessThanZeroFunds());
    expect(errors).toContainEqual(["0001", "total_clin_value", "-1", ValidationMessages.TOTAL_GT_ZERO]);
    expect(errors).toContainEqual(["0001", "obligated_funds", "-1", ValidationMessages.OBLIGATED_GT_ZERO]);
  });
  it("should return error map entries when given Clin has nonsensical funding values (total=0, obligated=0)", () => {
    const errors = validateClin(mockClinZeroFunds());
    expect(errors).toContainEqual(["0001", "total_clin_value", "0", ValidationMessages.TOTAL_GT_ZERO]);
    expect(errors).toContainEqual(["0001", "obligated_funds", "0", ValidationMessages.OBLIGATED_GT_ZERO]);
  });
  it("should return error map entries when given Clin has nonsensical funding values (obligated>total)", () => {
    const errors = validateClin(mockClinObligatedGreaterThanTotal());
    expect(errors).toContainEqual(["0001", "obligated_funds", "2", ValidationMessages.TOTAL_GT_OBLIGATED]);
    expect(errors).toContainEqual(["0001", "total_clin_value", "1", ValidationMessages.TOTAL_GT_OBLIGATED]);
  });
  // TODO: Verification of this business rule is pending. Allowing obligated to equal total for now.
  it("should return no error map entries when given Clin has these funding values (obligated=total)", () => {
    const errors = validateClin(mockClinObligatedEqualsTotal());
    expect(errors).toStrictEqual([]);
  });
});

describe("All Clins in Funding Step input validation tests", function () {
  it("should accept a Funding Step and validate all Clins contained therein", () => {
    const errors = validateFundingStepClins(mockFundingStepBadData());
    expect(errors.length).toEqual(12);
    expect(errors).toStrictEqual([
      ["0001", "obligated_funds", "2", ValidationMessages.TOTAL_GT_OBLIGATED],
      ["0001", "total_clin_value", "1", ValidationMessages.TOTAL_GT_OBLIGATED],
      ["0001", "total_clin_value", "0", ValidationMessages.TOTAL_GT_ZERO],
      ["0001", "obligated_funds", "0", ValidationMessages.OBLIGATED_GT_ZERO],
      ["0001", "pop_start_date", yesterday, ValidationMessages.START_BEFORE_END],
      ["0001", "pop_end_date", yesterday, ValidationMessages.START_BEFORE_END],
      ["0001", "pop_end_date", yesterday, ValidationMessages.END_FUTURE],
      ["0001", "pop_start_date", tomorrow, ValidationMessages.START_BEFORE_END],
      ["0001", "pop_end_date", today, ValidationMessages.START_BEFORE_END],
      ["0001", "pop_end_date", today, ValidationMessages.END_FUTURE],
      ["0001", "pop_start_date", "not an ISO date", ValidationMessages.START_VALID],
      ["0001", "pop_end_date", "2021-13-01", ValidationMessages.END_VALID],
    ]);
  });
});

describe("Error response creation tests", function () {
  it("should return error response that includes error_map in response body", () => {
    const obj = { errors: { propertyA: "property_value", propertyB: "property_value" } };
    const invalidProperties: Record<string, unknown> = obj;
    const response = createValidationErrorResponse(invalidProperties);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
    expect(JSON.parse(response.body).message).toMatch(/Invalid input/);
    expect(JSON.parse(response.body).error_map).toEqual(obj);
  });
  it("should return error response containing all invalid properties in error_map", async () => {
    const result = await handler(validRequestBadData);
    expect(result).toBeInstanceOf(ValidationErrorResponse);
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(JSON.parse(result.body).code).toEqual(ErrorCodes.INVALID_INPUT);
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

/**
 * Sample Funding Step with valid data
 * @returns a complete FundingStep with good data that should not cause input validation errors
 */
function mockFundingStepGoodData(): FundingStep {
  const mockTaskOrderFile: FileMetadata = {
    created_at: "2021-08-03T16:21:07.978Z",
    id: "b91db32f-40fa-4225-9885-b032f0d229fe",
    name: "TO_12345678910.pdf",
    size: 694331,
    status: FileScanStatus.ACCEPTED,
    updated_at: "2021-08-03T16:21:07.978Z",
  };
  return {
    task_order_number: "12345678910",
    task_order_file: mockTaskOrderFile,
    csp: CloudServiceProvider.AWS,
    clins: [mockClin()],
  };
}
/**
 * Sample Funding Step with invalid data
 * @returns a complete FundingStep with bad data that should cause input validation errors
 */
function mockFundingStepBadData(): FundingStep {
  const mockTaskOrderFile: FileMetadata = {
    created_at: "2021-08-03T16:21:07.978Z",
    id: "b91db32f-40fa-4225-9885-b032f0d229fe",
    name: "TO_12345678910.pdf",
    size: 694331,
    status: FileScanStatus.ACCEPTED,
    updated_at: "2021-08-03T16:21:07.978Z",
  };
  return {
    task_order_number: "12345678910",
    task_order_file: mockTaskOrderFile,
    csp: CloudServiceProvider.AWS,
    clins: [
      mockClinInvalidDates(),
      mockClinStartAfterEnd(),
      mockClinAlreadyEnded(),
      mockClinZeroFunds(),
      mockClinObligatedGreaterThanTotal(),
    ],
  };
}

/**
 * Returns a static clin containing only good inputs
 * @returns a complete Clin with values that should not cause validation errors
 */
function mockClin(): Clin {
  return {
    clin_number: "0001",
    idiq_clin: "1234",
    obligated_funds: 10000,
    pop_start_date: yesterday,
    pop_end_date: tomorrow,
    total_clin_value: 200000,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - invalid start and end dates
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinInvalidDates(): Clin {
  return {
    ...mockClin(),
    pop_start_date: "not an ISO date",
    pop_end_date: "2021-13-01",
  };
}
/**
 * Returns a static clin containing bad inputs
 * - start date is after the end date
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinStartAfterEnd(): Clin {
  return {
    ...mockClin(),
    pop_start_date: tomorrow,
    pop_end_date: today,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - start date is equal to the end date
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinStartEqualsEnd(): Clin {
  return {
    ...mockClin(),
    pop_start_date: today,
    pop_end_date: today,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - end date is in the past
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinAlreadyEnded(): Clin {
  return {
    ...mockClin(),
    pop_end_date: yesterday,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - obligated funds is less than zero
 * - total clin value is less than zero
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinLessThanZeroFunds(): Clin {
  return {
    ...mockClin(),
    obligated_funds: -1,
    total_clin_value: -1,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - obligated funds is zero
 * - total clin value is zero
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinZeroFunds(): Clin {
  return {
    ...mockClin(),
    obligated_funds: 0,
    total_clin_value: 0,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - obligated funds is greater than the total clin value
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinObligatedGreaterThanTotal(): Clin {
  return {
    ...mockClin(),
    obligated_funds: 2,
    total_clin_value: 1,
  };
}
/**
 * Returns a static clin containing an edge case
 * - obligated funds equal to the total clin value
 * @returns a complete Clin with values that should not cause validation errors
 */
function mockClinObligatedEqualsTotal(): Clin {
  return {
    ...mockClin(),
    obligated_funds: 1,
    total_clin_value: 1,
  };
}
