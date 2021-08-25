import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { FundingStep } from "../../models/FundingStep";
import { updateFundingStepOfPortfolioDraft, createValidationErrorResponse, handler } from "./createFundingStep";
import { ProvisioningStatus } from "../../models/ProvisioningStatus";
import { v4 as uuid } from "uuid";
import { ErrorStatusCode } from "../../utils/response";
import { ErrorCodes } from "../../models/Error";
import { REQUEST_BODY_EMPTY } from "../../utils/errors";

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

describe("handler()", function () {
  const emptyRequestBody = { body: "" } as APIGatewayProxyEvent;
  it("should return error response REQUEST_BODY_EMPTY when request body is empty", async () => {
    const response = await handler(emptyRequestBody);
    expect(response).toEqual(REQUEST_BODY_EMPTY);
  });
  it("should return HTTP response status code 400 Bad Request when request body is empty", async () => {
    const response = await handler(emptyRequestBody);
    expect(response.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
  it("should return a response body containing code 'INVALID_INPUT' when request body is empty", async () => {
    const response = await handler(emptyRequestBody);
    expect(JSON.parse(response.body).code).toEqual(ErrorCodes.INVALID_INPUT);
  });
  it("should return a response body containing message 'Request body must not be empty' when request body is empty", async () => {
    const response = await handler(emptyRequestBody);
    expect(JSON.parse(response.body).message).toEqual("Request body must not be empty");
  });
});
