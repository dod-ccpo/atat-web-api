import { APIGatewayProxyEvent } from "aws-lambda";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { Clin } from "../../models/Clin";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { FileMetadata, FileScanStatus } from "../../models/FileMetadata";
import { FundingStep } from "../../models/FundingStep";
import { validateFundingStepClins, handler, validateClin, verror } from "./createFundingStep";
import { isFundingStep } from "../../utils/validation";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import {
  REQUEST_BODY_EMPTY,
  PATH_PARAMETER_REQUIRED_BUT_MISSING,
  REQUEST_BODY_INVALID,
  DATABASE_ERROR,
  NO_SUCH_PORTFOLIO_DRAFT,
} from "../../utils/errors";
import { ErrorCodes } from "../../models/Error";

// '400':
//   description: Invalid input
//       schema:
//         $ref: '#/components/schemas/ValidationError'

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const validRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(mockFundingStep()),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

it("should return generic Error if exception caught", async () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  ddbMock.on(UpdateCommand).rejects("Some error occurred");
  const result = await handler(validRequest);
  expect(result).toBeInstanceOf(ErrorResponse);
  expect(result).toEqual(DATABASE_ERROR);
  expect(result.statusCode).toEqual(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  expect(JSON.parse(result.body).code).toEqual(ErrorCodes.OTHER);
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
    expect(isFundingStep(mockFundingStep())).toEqual(true); // control
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
    expect(false).toBe(false);
    const mockResponse = {
      updated_at: "2021-08-13T20:55:02.595Z",
      created_at: "2021-08-13T20:51:45.979Z",
      portfolio_step: mockFundingStep(),
      num_portfolio_managers: 0,
      status: "not_started",
      id: "595c31d3-190c-42c3-a9b6-77325fa5ed38",
    };
    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    const fundingStep: FundingStep = mockFundingStep();
    const fundingStepOutput: UpdateCommandOutput = { Attributes: { funding_step: JSON.stringify(fundingStep) } } as any;
    ddbMock.on(UpdateCommand).resolves(fundingStepOutput);
    const result = await handler(validRequest);
    expect(result).toBeInstanceOf(ApiSuccessResponse);
    expect(result.statusCode).toEqual(SuccessStatusCode.CREATED);
    expect(result.body).toEqual(JSON.stringify(mockFundingStep()));
  });
});

describe("Individual Clin validation tests", function () {
  const errors = Array<typeof verror>();
  it("should throw error if input does not look like a Clin", () => {
    expect(() => {
      validateClin({});
    }).toThrow(Error("Input must be a Clin object"));
  });
  it("should return true if given Clin is valid (passes all input validation)", () => {
    expect(validateClin(mockClin())).toStrictEqual([]);
    expect(validateClin(mockClin())).toStrictEqual(errors);
  });
  it("should return false if given Clin has invalid pop start date", () => {
    const clinInvalidStartDate: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "invalid" },
    };
    expect(validateClin(clinInvalidStartDate)).toStrictEqual([
      ["0001", "pop_start_date", "invalid", "start date must be a valid date"],
    ]);
  });
  it("should return false if given Clin has invalid pop end date", () => {
    const clinInvalidEndDate: Clin = {
      ...mockClin(),
      ...{ pop_end_date: "invalid" },
    };
    expect(validateClin(clinInvalidEndDate)).toStrictEqual([
      ["0001", "pop_end_date", "invalid", "end date must be a valid date"],
    ]);
  });
  it("should return false if given Clin has nonsensical pop dates (start>end)", () => {
    const clinStartAfterEnd: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "2015-10-21", pop_end_date: "1955-11-05" },
    };
    expect(validateClin(clinStartAfterEnd)).toStrictEqual([
      ["0001", "pop_start_date", "2015-10-21", "start date must occur before end date"],
      ["0001", "pop_end_date", "1955-11-05", "start date must occur before end date"],
      ["0001", "pop_end_date", "1955-11-05", "end date must be in the future"],
    ]);
  });
  it("should return false if given Clin has nonsensical pop dates (start=end)", () => {
    const clinStartEqualsEnd: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "1993-02-02", pop_end_date: "1993-02-02" },
    };
    expect(validateClin(clinStartEqualsEnd)).toStrictEqual([
      ["0001", "pop_start_date", "1993-02-02", "start date must occur before end date"],
      ["0001", "pop_end_date", "1993-02-02", "start date must occur before end date"],
      ["0001", "pop_end_date", "1993-02-02", "end date must be in the future"],
    ]);
  });
  it("should return false if given Clin has nonsensical pop dates (now>end)", () => {
    const clinPopExpired: Clin = {
      ...mockClin(),
      ...{ pop_end_date: "2021-08-26" },
    };
    expect(validateClin(clinPopExpired)).toStrictEqual([
      ["0001", "pop_start_date", "2021-09-01", "start date must occur before end date"],
      ["0001", "pop_end_date", "2021-08-26", "start date must occur before end date"],
      ["0001", "pop_end_date", "2021-08-26", "end date must be in the future"],
    ]);
  });
  it("should return false if given Clin has nonsensical funding values (total<0)", () => {
    const clinTotalLessThanZero: Clin = {
      ...mockClin(),
      ...{ total_clin_value: -1 },
    };
    expect(validateClin(clinTotalLessThanZero)).toStrictEqual([
      ["0001", "total_clin_value", "-1", "total clin value must be greater than zero"],
      ["0001", "obligated_funds", "10000", "total clin value must be greater than obligated funds"],
      ["0001", "total_clin_value", "-1", "total clin value must be greater than obligated funds"],
    ]);
  });
  it("should return false if given Clin has nonsensical funding values (total=0)", () => {
    const clinTotalIsZero: Clin = {
      ...mockClin(),
      ...{ total_clin_value: 0 },
    };
    expect(validateClin(clinTotalIsZero)).toStrictEqual([
      ["0001", "total_clin_value", "0", "total clin value must be greater than zero"],
      ["0001", "obligated_funds", "10000", "total clin value must be greater than obligated funds"],
      ["0001", "total_clin_value", "0", "total clin value must be greater than obligated funds"],
    ]);
  });
  it("should return false if given Clin has nonsensical funding values (obligated<0)", () => {
    const clinObligatedLessThanZero: Clin = {
      ...mockClin(),
      ...{ obligated_funds: -1 },
    };
    expect(validateClin(clinObligatedLessThanZero)).toStrictEqual([
      ["0001", "obligated_funds", "-1", "obligated funds must be greater than zero"],
    ]);
  });
  it("should return false if given Clin has nonsensical funding values (obligated=0)", () => {
    const clinObligatedIsZero: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 0 },
    };
    expect(validateClin(clinObligatedIsZero)).toStrictEqual([
      ["0001", "obligated_funds", "0", "obligated funds must be greater than zero"],
    ]);
  });
  it("should return false if given Clin has nonsensical funding values (obligated>total)", () => {
    const clinObligatedGreaterThanTotal: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 2, total_clin_value: 1 },
    };
    expect(validateClin(clinObligatedGreaterThanTotal)).toStrictEqual([
      ["0001", "obligated_funds", "2", "total clin value must be greater than obligated funds"],
      ["0001", "total_clin_value", "1", "total clin value must be greater than obligated funds"],
    ]);
  });
  // TODO: Verification of this business rule is pending.
  // Allowing obligated to equal total for now.
  it("should return false if given Clin has nonsensical funding values (obligated=total)", () => {
    const clinObligatedEqualToTotal: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 1, total_clin_value: 1 },
    };
    expect(validateClin(clinObligatedEqualToTotal)).toStrictEqual([]);
    expect(validateClin(clinObligatedEqualToTotal)).toStrictEqual(errors);
  });
});

describe("All Clins in a Funding Step validation tests", function () {
  it("should accept a Funding Step and validate all Clins contained therein", () => {
    const errors = validateFundingStepClins(mockFundingStep());
    expect(errors.length).toEqual(9);
    for (const error of errors) {
      expect(error[0].startsWith("BAD")).toBe(true);
    }
    expect(errors).toStrictEqual([
      ["BAD0006", "obligated_funds", "2", "total clin value must be greater than obligated funds"],
      ["BAD0006", "total_clin_value", "1", "total clin value must be greater than obligated funds"],
      ["BAD0005", "total_clin_value", "0", "total clin value must be greater than zero"],
      ["BAD0005", "obligated_funds", "0", "obligated funds must be greater than zero"],
      ["BAD0004", "pop_end_date", "2020-09-01", "end date must be in the future"],
      ["BAD0003", "pop_start_date", "2022-09-01", "start date must occur before end date"],
      ["BAD0003", "pop_end_date", "2021-09-01", "start date must occur before end date"],
      ["BAD0003", "pop_end_date", "2021-09-01", "end date must be in the future"],
      ["BAD0002", "pop_end_date", "2022-13-01", "end date must be a valid date"],
    ]);
  });
});

/**
 * FundingStepEx from API spec
 * @returns a complete FundingStep
 */
function mockFundingStep(): FundingStep {
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
      mockClin(),
      mockClinInvalidDates(),
      mockClinStartAfterEnd(),
      mockClinAlreadyEnded(),
      mockClinZeroFunds(),
      mockClinObligatedGreaterThanTotal(),
    ],
  };
}

/**
 * Returns a static clin
 * @returns a complete Clin
 */
function mockClin(): Clin {
  return {
    clin_number: "0001",
    idiq_clin: "1234",
    obligated_funds: 10000,
    pop_end_date: "2022-09-01",
    pop_start_date: "2021-09-01",
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
    clin_number: "BAD0002",
    idiq_clin: "1234",
    obligated_funds: 10000,
    pop_end_date: "2022-13-01",
    pop_start_date: "2021-02-30",
    total_clin_value: 200000,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - start date is after the end date
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinStartAfterEnd(): Clin {
  return {
    clin_number: "BAD0003",
    idiq_clin: "1234",
    obligated_funds: 10000,
    pop_end_date: "2021-09-01",
    pop_start_date: "2022-09-01",
    total_clin_value: 200000,
  };
}
/**
 * Returns a static clin containing bad inputs
 * - end date is in the past
 * @returns a complete Clin with values that should cause validation errors
 */
function mockClinAlreadyEnded(): Clin {
  return {
    clin_number: "BAD0004",
    idiq_clin: "1234",
    obligated_funds: 10000,
    pop_end_date: "2020-09-01",
    pop_start_date: "2019-09-01",
    total_clin_value: 200000,
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
    clin_number: "BAD0005",
    idiq_clin: "1234",
    obligated_funds: 0,
    pop_end_date: "2022-09-01",
    pop_start_date: "2021-09-01",
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
    clin_number: "BAD0006",
    idiq_clin: "1234",
    obligated_funds: 2,
    pop_end_date: "2022-09-01",
    pop_start_date: "2021-09-01",
    total_clin_value: 1,
  };
}
