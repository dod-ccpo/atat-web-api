import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { FundingStep } from "../../models/FundingStep";
import {
  updateFundingStepOfPortfolioDraft,
  createValidationErrorResponse,
  handler,
  validateClin,
} from "./createFundingStep";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuid } from "uuid";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { ErrorCodes } from "../../models/Error";
import { REQUEST_BODY_EMPTY, PATH_VARIABLE_REQUIRED_BUT_MISSING, REQUEST_BODY_INVALID } from "../../utils/errors";
import { isFundingStep } from "../../utils/validation";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const mockPortfolioDraftId = uuid();
const mockTOfile = {
  id: uuid(),
  name: "Task_Order_76543211900.pdf",
};
const mockClin = {
  clin_number: "0001",
  idiq_clin: "002",
  total_clin_value: 100000,
  obligated_funds: 10000,
  pop_start_date: "2021-07-01",
  pop_end_date: "2022-07-01",
};
const mockFundingStep = {
  task_order_number: "TO76543211900",
  task_order_file: mockTOfile,
  csp: CloudServiceProvider.AWS,
  clins: [mockClin, mockClin, mockClin],
};
const now = new Date();
const mockPortfolioDraft = {
  updated_at: now.toISOString,
  created_at: now.toISOString,
  funding_step: mockFundingStep,
  num_portfolio_managers: 1,
  status: ProvisioningStatus.NOT_STARTED,
  id: mockPortfolioDraftId,
};

const fundingStepMinimal: FundingStep = {
  task_order_number: "",
  task_order_file: {
    id: "",
    name: "",
  },
  csp: CloudServiceProvider.AWS,
  clins: [],
};

const fundingStepZeroClins: FundingStep = {
  task_order_number: "TO123456789",
  task_order_file: {
    id: "51312a97-e53a-49b4-bf23-5039759bf843",
    name: "Task_Order_123456789.pdf",
  },
  csp: CloudServiceProvider.AZURE,
  clins: [],
};

const fundingStepOneClin: FundingStep = {
  task_order_number: "TO987654321",
  task_order_file: {
    id: "51312a97-e53a-49b4-bf23-5039759bf843",
    name: "Task_Order_987654321.pdf",
  },
  csp: CloudServiceProvider.AWS,
  clins: [
    {
      clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 10000,
      obligated_funds: 1000,
      pop_start_date: "2020-03-15",
      pop_end_date: "2022-06-15",
    },
  ],
};

const fundingStepTwoClins: FundingStep = {
  task_order_number: "TO9876501234",
  task_order_file: {
    id: "51312a97-e53a-49b4-bf23-5039759bf843",
    name: "Task_Order_9876501234.pdf",
  },
  csp: CloudServiceProvider.AZURE,
  clins: [
    {
      clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 11000.75,
      obligated_funds: 5300.25,
      pop_start_date: "2021-01-01",
      pop_end_date: "2021-12-31",
    },
    {
      clin_number: "0002",
      idiq_clin: "004",
      total_clin_value: 250000.99,
      obligated_funds: 25000.55,
      pop_start_date: "2021-04-15",
      pop_end_date: "2025-04-15",
    },
  ],
};

const fundingStepInvalidMissingCsp /*: FundingStep */ = {
  task_order_number: "",
  task_order_file: {
    id: "",
    name: "",
  },
  // csp: CloudServiceProvider.AWS, - Missing CSP
  clins: [],
};

const fundingStepInvalidMissingTONumber /*: FundingStep */ = {
  // task_order_number: "", - Missing TO Number
  task_order_file: {
    id: "",
    name: "",
  },
  csp: CloudServiceProvider.AWS,
  clins: [],
};

describe("updateFundingStepOfPortfolioDraft()", function () {
  it("should accept object that looks like a Funding Step (minimal)", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: mockPortfolioDraft });
    const data = await updateFundingStepOfPortfolioDraft(mockPortfolioDraftId, fundingStepMinimal);
    expect(data.Attributes).toEqual(mockPortfolioDraft);
  });
  it("should accept object that looks like a Funding Step (0 CLINs)", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: mockPortfolioDraft });
    const data = await updateFundingStepOfPortfolioDraft(mockPortfolioDraftId, fundingStepZeroClins);
    expect(data.Attributes).toEqual(mockPortfolioDraft);
  });
  it("should accept object that looks like a Funding Step (1 CLIN)", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: mockPortfolioDraft });
    const data = await updateFundingStepOfPortfolioDraft(mockPortfolioDraftId, fundingStepOneClin);
    expect(data.Attributes).toEqual(mockPortfolioDraft);
  });
  it("should accept object that looks like a Funding Step (2 CLINs)", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: mockPortfolioDraft });
    const data = await updateFundingStepOfPortfolioDraft(mockPortfolioDraftId, fundingStepTwoClins);
    expect(data.Attributes).toEqual(mockPortfolioDraft);
  });
});

describe("createValidationErrorResponse()", function () {
  const invalidProperties = { invalidPropertyOne: "1", invalidPropertyTwo: "2" };
  const response = createValidationErrorResponse(invalidProperties);
  it("should accept an object containing one or more invalid properties", () => {
    try {
      createValidationErrorResponse(invalidProperties);
    } catch (e) {
      throw Error("Unexpected error");
    }
  });
  it("should return HTTP response status code 400 Bad Request", () => {
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing an error map with invalid properties", () => {
    expect(JSON.parse(response.body).errorMap).toEqual(invalidProperties);
  });
  it("should return a response body containing code 'INVALID_INPUT'", () => {
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Invalid input'", () => {
    expect(JSON.parse(response.body).message).toEqual("Invalid input");
  });
  it("should throw error if properties parameter is empty", () => {
    expect(() => {
      createValidationErrorResponse({});
    }).toThrow(Error("Parameter 'invalidProperties' must not be empty"));
  });
  it("should throw error if properties parameter contains empty string as key", () => {
    expect(() => {
      createValidationErrorResponse({ "": "" });
    }).toThrow(Error("Parameter 'invalidProperties' must not have empty string as key"));
  });
});

const normalMinimalRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepMinimal),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;
const normalZeroClinsRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepZeroClins),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;
const normalOneClinRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepOneClin),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;
const normalTwoClinsRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepTwoClins),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const missingPathVariableRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepOneClin),
  pathParameters: {}, // missing portfolioDraftId
} as any;

const emptyBodyRequest: APIGatewayProxyEvent = {
  body: "", // empty
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const invalidBodyRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepOneClin).slice(10), // slice 10 chars from valid JSON
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const invalidFundingStepMissingCspRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepInvalidMissingCsp),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

const invalidFundingStepMissingTONumberRequest: APIGatewayProxyEvent = {
  body: JSON.stringify(fundingStepInvalidMissingTONumber),
  pathParameters: { portfolioDraftId: mockPortfolioDraftId },
} as any;

describe("when handler() receives empty request body", function () {
  it("should return error response REQUEST_BODY_EMPTY", async () => {
    const response = await handler(emptyBodyRequest);
    expect(response).toEqual(REQUEST_BODY_EMPTY);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(emptyBodyRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(emptyBodyRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Request body must not be empty'", async () => {
    const response = await handler(emptyBodyRequest);
    expect(JSON.parse(response.body).message).toEqual("Request body must not be empty");
  });
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

describe("when handler() receives invalid request body", function () {
  it("should return error response REQUEST_BODY_INVALID", async () => {
    const response = await handler(invalidBodyRequest);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(invalidBodyRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(invalidBodyRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'A valid request body must be provided'", async () => {
    const response = await handler(invalidBodyRequest);
    expect(JSON.parse(response.body).message).toEqual("A valid request body must be provided");
  });
});

describe("when handler() receives invalid FundingStep object (missing CSP) in request body", function () {
  it("should return error response REQUEST_BODY_INVALID", async () => {
    const response = await handler(invalidFundingStepMissingCspRequest);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(invalidFundingStepMissingCspRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(invalidFundingStepMissingCspRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'A valid request body must be provided'", async () => {
    const response = await handler(invalidFundingStepMissingCspRequest);
    expect(JSON.parse(response.body).message).toEqual("A valid request body must be provided");
  });
});

describe("when handler() receives invalid FundingStep object (missing TO Number) in request body", function () {
  it("should return error response REQUEST_BODY_INVALID", async () => {
    const response = await handler(invalidFundingStepMissingTONumberRequest);
    expect(response).toEqual(REQUEST_BODY_INVALID);
  });
  it("should return HTTP response status code 400 Bad Request", async () => {
    const response = await handler(invalidFundingStepMissingTONumberRequest);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT'", async () => {
    const response = await handler(invalidFundingStepMissingTONumberRequest);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'A valid request body must be provided'", async () => {
    const response = await handler(invalidFundingStepMissingTONumberRequest);
    expect(JSON.parse(response.body).message).toEqual("A valid request body must be provided");
  });
});

describe("when handler() recieves all required and valid input (minimal)", function () {
  it("should return HTTP response status code 201 Created", async () => {
    const response = await handler(normalMinimalRequest);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
  it("should return a response body that looks like a Funding Step", async () => {
    const response = await handler(normalMinimalRequest);
    expect(isFundingStep(JSON.parse(response.body))).toBeTruthy();
  });
});

describe("when handler() recieves all required and valid input (0 CLINs)", function () {
  it("should return HTTP response status code 201 Created", async () => {
    const response = await handler(normalZeroClinsRequest);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
  it("should return a response body that looks like a Funding Step", async () => {
    const response = await handler(normalZeroClinsRequest);
    expect(isFundingStep(JSON.parse(response.body))).toBeTruthy();
  });
});

describe("when handler() recieves all required and valid input (1 CLIN)", function () {
  it("should return HTTP response status code 201 Created", async () => {
    const response = await handler(normalOneClinRequest);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
  it("should return a response body that looks like a Funding Step", async () => {
    const response = await handler(normalOneClinRequest);
    expect(isFundingStep(JSON.parse(response.body))).toBeTruthy();
  });
});

describe("when handler() recieves all required and valid input (2 CLINs)", function () {
  it("should return HTTP response status code 201 Created", async () => {
    const response = await handler(normalTwoClinsRequest);
    expect(response.statusCode).toEqual(SuccessStatusCode.CREATED);
  });
  it("should return a response body that looks like a Funding Step", async () => {
    const response = await handler(normalTwoClinsRequest);
    expect(isFundingStep(JSON.parse(response.body))).toBeTruthy();
  });
});

describe("validateClin()", function () {
  const clinInvalidStartDate = {
    ...mockClin,
    ...{ pop_start_date: "invalid" },
  };
  const clinInvalidEndDate = {
    ...mockClin,
    ...{ pop_end_date: "invalid" },
  };
  const clinStartAfterEnd = {
    ...mockClin,
    ...{ pop_start_date: "2015-10-21", pop_end_date: "1955-11-05" },
  };
  const clinStartEqualsEnd = {
    ...mockClin,
    ...{ pop_start_date: "1993-02-02", pop_end_date: "1993-02-02" },
  };
  const clinPopExpired = {
    ...mockClin,
    ...{ pop_end_date: "2021-08-26" },
  };
  const clinTotalLessThanZero = {
    ...mockClin,
    ...{ total_clin_value: -1 },
  };
  const clinTotalIsZero = {
    ...mockClin,
    ...{ total_clin_value: 0 },
  };
  const clinObligatedLessThanZero = {
    ...mockClin,
    ...{ obligated_funds: -1 },
  };
  const clinObligatedIsZero = {
    ...mockClin,
    ...{ obligated_funds: 0 },
  };
  const clinObligatedGreaterThanTotal = {
    ...mockClin,
    ...{ obligated_funds: 2, total_clin_value: 1 },
  };
  const clinObligatedEqualToTotal = {
    ...mockClin,
    ...{ obligated_funds: 1, total_clin_value: 1 },
  };
  it("should throw error if input does not look like a Clin", () => {
    expect(() => {
      validateClin({});
    }).toThrow(Error("Input must be a Clin object"));
  });
  it("should return true if given Clin is valid (passes all input validation)", () => {
    expect(validateClin(mockClin)).toBe(true);
  });
  it("should return false if given Clin has invalid pop start date", () => {
    expect(validateClin(clinInvalidStartDate)).toBe(false);
  });
  it("should return false if given Clin has invalid pop end date", () => {
    expect(validateClin(clinInvalidEndDate)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (start>end)", () => {
    expect(validateClin(clinStartAfterEnd)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (start=end)", () => {
    expect(validateClin(clinStartEqualsEnd)).toBe(false);
  });
  it("should return false if given Clin has nonsensical pop dates (now>end)", () => {
    expect(validateClin(clinPopExpired)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (total<0)", () => {
    expect(validateClin(clinTotalLessThanZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (total=0)", () => {
    expect(validateClin(clinTotalIsZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated<0)", () => {
    expect(validateClin(clinObligatedLessThanZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated=0)", () => {
    expect(validateClin(clinObligatedIsZero)).toBe(false);
  });
  it("should return false if given Clin has nonsensical funding values (obligated>total)", () => {
    expect(validateClin(clinObligatedGreaterThanTotal)).toBe(false);
  });
  // TODO: Verification of this business rule is pending
  it("should return false if given Clin has nonsensical funding values (obligated=total)", () => {
    expect(validateClin(clinObligatedEqualToTotal)).toBe(false);
  });
});
