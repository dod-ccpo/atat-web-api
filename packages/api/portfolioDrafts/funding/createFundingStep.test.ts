import { APIGatewayProxyEvent } from "aws-lambda";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { Clin } from "../../models/Clin";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { FileMetadata, FileScanStatus } from "../../models/FileMetadata";
import { FundingStep } from "../../models/FundingStep";
import { handler, validateClin } from "./createFundingStep";
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

describe("Clin validation tests", function () {
  it("should throw error if input does not look like a Clin", () => {
    expect(() => {
      validateClin({});
    }).toThrow(Error("Input must be a Clin object"));
  });
  it("should return true if given Clin is valid (passes all input validation)", () => {
    expect(validateClin(mockClin())).toBe(true);
  });
  it("should return false if given Clin has invalid pop start date", () => {
    const clinInvalidStartDate: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "invalid" },
    };
    expect(validateClin(clinInvalidStartDate)).toBe(false);
  });
  it("should return false if given Clin has invalid pop end date", () => {
    const clinInvalidEndDate: Clin = {
      ...mockClin(),
      ...{ pop_end_date: "invalid" },
    };
    expect(validateClin(clinInvalidEndDate)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (start>end)", () => {
    const clinStartAfterEnd: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "2015-10-21", pop_end_date: "1955-11-05" },
    };
    expect(validateClin(clinStartAfterEnd)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (start=end)", () => {
    const clinStartEqualsEnd: Clin = {
      ...mockClin(),
      ...{ pop_start_date: "1993-02-02", pop_end_date: "1993-02-02" },
    };
    expect(validateClin(clinStartEqualsEnd)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (now>end)", () => {
    const clinPopExpired: Clin = {
      ...mockClin(),
      ...{ pop_end_date: "2021-08-26" },
    };
    expect(validateClin(clinPopExpired)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (total<0)", () => {
    const clinTotalLessThanZero: Clin = {
      ...mockClin(),
      ...{ total_clin_value: -1 },
    };
    expect(validateClin(clinTotalLessThanZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (total=0)", () => {
    const clinTotalIsZero: Clin = {
      ...mockClin(),
      ...{ total_clin_value: 0 },
    };
    expect(validateClin(clinTotalIsZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated<0)", () => {
    const clinObligatedLessThanZero: Clin = {
      ...mockClin(),
      ...{ obligated_funds: -1 },
    };
    expect(validateClin(clinObligatedLessThanZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated=0)", () => {
    const clinObligatedIsZero: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 0 },
    };
    expect(validateClin(clinObligatedIsZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated>total)", () => {
    const clinObligatedGreaterThanTotal: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 2, total_clin_value: 1 },
    };
    expect(validateClin(clinObligatedGreaterThanTotal)).toBe(false);
  });
  // TODO: Verification of this business rule is pending.
  // Allowing obligated to equal total for now.
  it("should return false if given Clin has nonsensical funding values (obligated=total)", () => {
    const clinObligatedEqualToTotal: Clin = {
      ...mockClin(),
      ...{ obligated_funds: 1, total_clin_value: 1 },
    };
    expect(validateClin(clinObligatedEqualToTotal)).toBe(true);
  });
});

/**
 * FundingStepEx from API spec
 * @returns a complete FundingStep
 */
function mockFundingStep(): FundingStep {
  const mockTaskOrderFile: FileMetadata = {
    created_at: "2021-08-03T16:21:07.978Z",
    id: "1234",
    name: "Mock task order file",
    size: 100,
    status: FileScanStatus.PENDING,
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
