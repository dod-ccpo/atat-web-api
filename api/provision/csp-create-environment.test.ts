import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { HothProvisionRequest } from "../../models/provisioning-jobs";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-create-environment";
import {
  addEnvironmentRequest,
  CSP_A_TEST_ENDPOINT,
  CSP_B_TEST_ENDPOINT,
  TEST_ENVIRONMENT_ID,
} from "../util/common-test-fixtures";
import { ProvisionCspResponse, ProvisioningStatusType } from "../client";

// Reused mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;

jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Add Environment Tests", () => {
  it("should return a 200 for CSP_A requests", async () => {
    // GIVEN
    const addEnvironmentProvisionJob = constructProvisionRequestForCsp("CSP_A", addEnvironmentRequest);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_A", uri: CSP_A_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );
    const transformedRequest = {
      environment: addEnvironmentRequest.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };
    const transformedResponse = {
      environment: {
        ...addEnvironmentRequest.payload,
        id: TEST_ENVIRONMENT_ID,
      },
    };

    const expectedResponse = {
      code: 200,
      content: {
        request: {
          environment: addEnvironmentRequest.payload,
          portfolioId: addEnvironmentProvisionJob.portfolioId,
        },
        response: {
          ...transformedResponse,
          $metadata: {
            request: transformedRequest,
            status: 200,
          },
        },
      },
      initialSnowRequest: addEnvironmentProvisionJob,
    };

    // WHEN
    const response = (await handler(addEnvironmentProvisionJob, {} as Context)) as ProvisionCspResponse;

    // THEN
    expect(response).toEqual(expectedResponse);
    expect(response.code).toBe(SuccessStatusCode.OK);
  });

  it("should return 202 with a reformatted CSP_B response", async () => {
    // GIVEN
    const addEnvironmentProvisionJob = constructProvisionRequestForCsp("CSP_B", addEnvironmentRequest);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_B", uri: CSP_B_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );
    const transformedRequest = {
      environment: addEnvironmentRequest.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };

    const expectedResponse = {
      code: 202,
      content: {
        request: transformedRequest,
        response: {
          location: CSP_B_TEST_ENDPOINT,
          status: {
            status: ProvisioningStatusType.SUCCESS,
            portfolioId: addEnvironmentProvisionJob.portfolioId,
            provisioningJobId: addEnvironmentProvisionJob.jobId,
          },
          $metadata: {
            request: transformedRequest,
            status: 202,
          },
        },
      },
      initialSnowRequest: addEnvironmentProvisionJob,
    };

    // WHEN
    const response = (await handler(addEnvironmentProvisionJob, {} as Context)) as ProvisionCspResponse;

    // THEN
    expect(response).toEqual(expectedResponse);
    expect(response.code).toBe(SuccessStatusCode.ACCEPTED);
  });
});

// This test is skipped because it covers the old mock behavior
describe("Failed invocation operations", () => {
  it.each([
    { desc: "empty", request: {} },
    { desc: "undefined", request: undefined },
    { desc: "missing endpoint", request: { cspInvocation: {} } },
  ])("should return a 400 when the request body is $desc", async ({ request }) => {
    const response = (await handler(request as HothProvisionRequest, {} as Context)) as ValidationErrorResponse;
    expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });

  // TODO: Add the following test cases:
  // CSP internal error => HTTP 500
  // HOTH internal error => HTTP 500
  // ProvisioningStatusType.FAILURE => HTTP 400
  // Portfolio not found => HTTP 404
  // Additional properties in payload => HTTP 400
});

export function constructProvisionRequestForCsp(csp: string, request: HothProvisionRequest): HothProvisionRequest {
  const body = {
    ...request,
    targetCspName: csp,
  };
  return {
    ...body,
  };
}
