import { Context } from "aws-lambda";
import {
  ApiSuccessResponse,
  ErrorStatusCode,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../../utils/response";
import { Clin } from "../../models/Clin";
import { handler } from "./createFundingStep";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { FundingStep, ValidationMessage } from "../../models/FundingStep";
import { mockClient } from "aws-sdk-client-mock";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuidv4 } from "uuid";
import { DATABASE_ERROR, NO_SUCH_PORTFOLIO_DRAFT } from "../../utils/errors";
import { ApiGatewayEventParsed } from "../../utils/eventHandlingTool";
import { FileMetadataSummary } from "../../models/FileMetadataSummary";
import {
  createBusinessRulesValidationErrorResponse,
  validateClin,
  validateFundingStepClins,
} from "../../utils/requestValidation";

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

const validRequest: ApiGatewayEventParsed<FundingStep> = {
  body: mockFundingStepGoodData(),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

const validRequestBadData: ApiGatewayEventParsed<FundingStep> = {
  body: mockFundingStepBadData(),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

const validRequestBadBusinessRulesData: ApiGatewayEventParsed<FundingStep> = {
  body: mockFundingStepBadBusinessRulesData(),
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
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(DATABASE_ERROR);
    expect(result?.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
  it("should return 404 if base portfolio draft doesn't exist", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    ddbMock.on(UpdateCommand).rejects({ name: "ConditionalCheckFailedException" });
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  });
});

describe("Path parameter tests", function () {
  it("should require path param", async () => {
    const emptyRequest: ApiGatewayEventParsed<FundingStep> = {
      body: mockFundingStepGoodData(),
    } as any;
    const result = await handler(emptyRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  });

  it("should return error when path param not UUIDv4 (to avoid attempting update)", async () => {
    const invalidRequest: ApiGatewayEventParsed<FundingStep> = {
      body: mockFundingStepGoodData(),
      pathParameters: { portfolioDraftId: "invalid" },
    } as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(NO_SUCH_PORTFOLIO_DRAFT);
    expect(result?.statusCode).toEqual(ErrorStatusCode.NOT_FOUND);
  });
});

describe("Request body tests", function () {
  /*
  * TODO: AT-6734 Refactor this test due to it relying on the error wrapper
  * This should return an OtherErrorResponse (it does with Postman), but when unit tested it
  * returns a ValidationError for required field. Now this isn't wrong, but it seems that
  * the test to check if the JSON can't be parsed is unacheivable because it is always parsed
  * as a ApiGatewayEventParsed. Figure this out when errorHandlingMiddleware covers everything.
  it("should return error when request body is empty or json is invalid", async () => {
    const invalidRequest: ApiGatewayEventParsed<FundingStep> = {
      pathParameters: { portfolioDraftId: uuidv4() },
      body: '["foo", "bar\\"]', // invalid JSON
    } as any;
    const result = await handler(invalidRequest, {} as Context, () => null);
    console.log(result);
    const response = JSON.parse(result?.body ?? "");

    expect(result).toBeInstanceOf(OtherErrorResponse);
    expect(result).toEqual(REQUEST_BODY_INVALID);
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(response.body.messsage).toMatch(/A valid request body must be provided/);
  }); */

  it("should return error when request body is not a funding step", async () => {
    const notFundingStepRequest: ApiGatewayEventParsed<FundingStep> = {
      body: JSON.stringify({ foo: "bar" }), // valid json
      pathParameters: { portfolioDraftId: uuidv4() },
    } as any;
    const result = await handler(notFundingStepRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
  });
});
describe("Successful operation tests", function () {
  it("should return funding step and http status code 201", async () => {
    const now = new Date().toISOString();
    const mockResponse = {
      updated_at: now,
      created_at: now,
      funding_step: mockFundingStepGoodData(),
      num_task_orders: 1,
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
    const result = await handler(validRequest, {} as Context, () => null);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result?.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result?.body).toStrictEqual(JSON.stringify(mockFundingStepGoodData()));
    const responseBody = JSON.parse(result?.body ?? "");
    const numOfTaskOrders = responseBody.task_orders.length;
    expect(numOfTaskOrders).toBe(mockResponse.num_task_orders);
  });
});

describe("Incorrect number of task orders", function () {
  it("should return falsy due to incorrect number of task orders", async () => {
    const mockResponse = {
      updated_at: now,
      created_at: now,
      funding_step: mockFundingStepGoodData(),
      num_task_orders: 3,
      status: ProvisioningStatus.NOT_STARTED,
      id: uuidv4(),
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const result = await handler(validRequest, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(responseBody.task_orders.length === mockResponse.num_task_orders).toBeFalsy();
  });
});
/// //here
describe("Individual Clin input validation tests", function () {
  it("should return no error map entries when given Clin has good data", () => {
    expect(validateClin(mockClin())).toStrictEqual([]);
  });
  it("should return error map entries when given Clin has invalid pop dates (start>end)", () => {
    const errors = validateClin(mockClinStartAfterEnd());
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
    const errors = validateClin(mockClinStartEqualsEnd());
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
    const errors = validateClin(mockClinAlreadyEnded());
    expect(errors).toContainEqual({
      clinNumber: "0001",
      invalidParameterName: "pop_end_date",
      invalidParameterValue: yesterday,
      validationMessage: ValidationMessage.END_FUTURE,
    });
  });

  it("should return error map entries when given Clin has invalid funding amounts (obligated>total)", () => {
    const errors = validateClin(mockClinObligatedGreaterThanTotal());
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
  it("should return no error map entries when given Clin has these funding values (obligated=total)", () => {
    const errors = validateClin(mockClinObligatedEqualsTotal());
    expect(errors).toStrictEqual([]);
  });
});

describe("Middy validation checks", function () {
  it("should return ValidationErrorResponse that includes error_map in response body", async () => {
    const result = await handler(validRequestBadData, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch(/Request failed validation/);
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    // task_order_number is invalid
    expect(responseBody.error_map[0].instancePath).toEqual("/body/task_orders/0/task_order_number");
    expect(responseBody.error_map[0].message).toEqual('must match pattern "^[\\d]{13,17}$"');
    // clin_number is invalid
    expect(responseBody.error_map[1].instancePath).toEqual("/body/task_orders/0/clins/0/clin_number");
    expect(responseBody.error_map[1].message).toEqual('must match pattern "(?!^0{4}$)^\\d{4}$"');
    expect(responseBody.error_map[2].message).toEqual('must match pattern "(?!^0{4}$)^\\d{4}$"');
    expect(responseBody.error_map[3].message).toEqual('must match pattern "(?!^0{4}$)^\\d{4}$"');
    // pop_start_date/pop_end_date is invalid
    expect(responseBody.error_map[4].message).toEqual('must match format "date"');
    expect(responseBody.error_map[5].message).toEqual('must match format "date"');
    // total_clin_value/obligated_funds is invalid
    expect(responseBody.error_map[6].message).toEqual("must be > 0");
    expect(responseBody.error_map[7].message).toEqual("must be > 0");
    expect(result).toBeInstanceOf(ValidationErrorResponse);
  });
  it("should return ValidationErrorResponse due failing business rules validation", async () => {
    const result = await handler(validRequestBadBusinessRulesData, {} as Context, () => null);
    const responseBody = JSON.parse(result?.body ?? "");
    expect(result?.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
    expect(responseBody.message).toMatch("Request failed validation (business rules)");
    expect(responseBody.code).toMatch(/INVALID_INPUT/);
    expect(responseBody.error_map[0].validationMessage).toEqual("start date must be before end date");
    expect(responseBody.error_map[0].invalidParameterName).toEqual("pop_start_date");
    expect(responseBody.error_map[2].validationMessage).toEqual("end date must be in the future");
    expect(responseBody.error_map[2].invalidParameterName).toEqual("pop_end_date");
    expect(responseBody.error_map[7].validationMessage).toEqual(
      "total clin value must be greater than obligated funds"
    );
    expect(responseBody.error_map[7].invalidParameterName).toEqual("total_clin_value");

    expect(result).toBeInstanceOf(ValidationErrorResponse);
  });
});

describe("All Clins in Funding Step input validation tests", function () {
  it("should accept a Funding Step and validate all Clins contained therein", () => {
    const errors = validateFundingStepClins(mockFundingStepBadBusinessRulesData());
    expect(errors.length).toEqual(8);

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
  });
});

describe("Error response creation tests", function () {
  it("should return error response that includes error_map in response body", () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    const obj = { errors: { propertyA: "property_value", propertyB: "property_value" } };
    const invalidProperties: Record<string, unknown> = obj;
    expect(() => {
      createBusinessRulesValidationErrorResponse(invalidProperties);
    }).toThrow(Error("Business rules validation failed"));
  });
  it("should throw error if invalid properties input is empty", () => {
    const emptyInvalidProperties: Record<string, unknown> = {};
    expect(() => {
      createBusinessRulesValidationErrorResponse(emptyInvalidProperties);
    }).toThrow(Error("Parameter 'invalidProperties' must not be empty"));
  });
  it("should throw error if invalid properties input has empty string as key", () => {
    const emptyStringKeyInvalidProperties: Record<string, unknown> = {
      "": { propertyA: "property_value", propertyB: "property_value" },
    };
    expect(() => {
      createBusinessRulesValidationErrorResponse(emptyStringKeyInvalidProperties);
    }).toThrow(Error("Parameter 'invalidProperties' must not have empty string as key"));
  });
});

/**
 * Sample Funding Step with valid data
 * @returns a complete FundingStep with good data that should not cause input validation errors
 */
function mockFundingStepGoodData(): FundingStep {
  const mockTaskOrderFile: FileMetadataSummary = {
    id: "b91db32f-40fa-4225-9885-b032f0d229fe",
    name: "TO_12345678910.pdf",
  };
  return {
    task_orders: [
      {
        task_order_number: "12345678910123",
        task_order_file: mockTaskOrderFile,
        clins: [mockClin()],
      },
    ],
  };
}
/**
 * Sample Funding Step with invalid data
 * @returns a complete FundingStep with bad data that should cause input validation errors
 */
function mockFundingStepBadData(): FundingStep {
  const mockTaskOrderFile: FileMetadataSummary = {
    id: "b91db32f-40fa-4225-9885-b032f0d229fe",
    name: "TO_12345678910.pdf",
  };
  return {
    task_orders: [
      {
        task_order_number: "12345678910",
        task_order_file: mockTaskOrderFile,
        clins: [
          mockClinInvalidClinNumberTooShort(),
          mockClinInvalidClinNumberTooLong(),
          mockClinInvalidClinNumberAllZeros(),
          mockClinInvalidDates(),
          mockClinStartAfterEnd(),
          mockClinAlreadyEnded(),
          mockClinZeroFunds(),
          mockClinObligatedGreaterThanTotal(),
          // Note, can't add mockClinNotANumberFunds() here
        ],
      },
    ],
  };
}

/**
 * Sample Funding Step with invalid business rules data
 * @returns a complete FundingStep with bad data that should cause business rules validation errors
 */
function mockFundingStepBadBusinessRulesData(): FundingStep {
  const mockTaskOrderFile: FileMetadataSummary = {
    id: "b91db32f-40fa-4225-9885-b032f0d229fe",
    name: "TO_12345678910.pdf",
  };
  return {
    task_orders: [
      {
        task_order_number: "12345678910123",
        task_order_file: mockTaskOrderFile,
        clins: [
          mockClinStartAfterEnd(),
          mockClinAlreadyEnded(),
          mockClinObligatedGreaterThanTotal(),
          // Note, can't add mockClinNotANumberFunds() here
        ],
      },
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
 * - clin number is too short
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinInvalidClinNumberTooShort(): Clin {
  return {
    ...mockClin(),
    clin_number: "1",
  };
}
/**
 * Returns a static clin containing bad inputs
 * - clin number is too long
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinInvalidClinNumberTooLong(): Clin {
  return {
    ...mockClin(),
    clin_number: "00001",
  };
}
/**
 * Returns a static clin containing bad inputs
 * - clin number is all zeros
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinInvalidClinNumberAllZeros(): Clin {
  return {
    ...mockClin(),
    clin_number: "0000",
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
