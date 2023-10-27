import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-create-environment";
import {
  cspAAddEnvironmentRequest,
  constructProvisionRequestForCsp,
  CSP_A,
  CSP_A_TEST_ENDPOINT,
  CSP_B,
  CSP_B_STATUS_ENDPOINT,
  CSP_B_TEST_ENDPOINT,
  TEST_ENVIRONMENT_ID, cspAAddEnvironmentRequestNewSchema, cspAAddEnvironmentRequestNewSchemaIsMigration
} from "../util/common-test-fixtures";
import { HothProvisionRequest, ProvisionCspResponse, ProvisioningStatusType } from "../client";

// Reused mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;

jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;

const fakeNow = new Date("2030-01-02");
beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers().setSystemTime(fakeNow);
});

describe("Add Environment Tests", () => {
  it("should return a 200 for CSP_A requests", async () => {
    // GIVEN
    const deadline = new Date(fakeNow);
    deadline.setHours(deadline.getHours() + 2);

    const addEnvironmentProvisionJob = constructProvisionRequestForCsp(CSP_A, cspAAddEnvironmentRequest);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: CSP_A, uri: CSP_A_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );
    const transformedRequest = {
      environment: cspAAddEnvironmentRequest.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };
    const transformedResponse = {
      environment: {
        ...cspAAddEnvironmentRequest.payload,
        id: TEST_ENVIRONMENT_ID,
      },
    };

    const expectedResponse = {
      code: 200,
      content: {
        request: {
          environment: cspAAddEnvironmentRequest.payload,
          portfolioId: addEnvironmentProvisionJob.portfolioId,
          provisionDeadline: deadline.toISOString(),
        },
        response: {
          ...transformedResponse,
          $metadata: {
            request: {
              ...transformedRequest,
              provisionDeadline: deadline.toISOString(),
            },
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
    console.log(response.content.request.provisionDeadline);
  });

  it("should return 202 with a reformatted CSP_B response", async () => {
    // GIVEN
    const deadline = new Date(fakeNow);
    deadline.setHours(deadline.getHours() + 2);
    const addEnvironmentProvisionJob = constructProvisionRequestForCsp(CSP_B, cspAAddEnvironmentRequest);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: CSP_B, uri: CSP_B_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );
    const transformedRequest = {
      environment: cspAAddEnvironmentRequest.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };

    const expectedResponse = {
      code: 202,
      content: {
        request: {
          ...transformedRequest,
          provisionDeadline: deadline.toISOString(),
        },
        response: {
          location: CSP_B_STATUS_ENDPOINT,
          status: {
            status: ProvisioningStatusType.IN_PROGRESS,
            portfolioId: addEnvironmentProvisionJob.portfolioId,
            provisioningJobId: addEnvironmentProvisionJob.jobId,
          },
          $metadata: {
            request: {
              ...transformedRequest,
              provisionDeadline: deadline.toISOString(),
            },
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

  it("should return a 200 for CSP_A requests new schema", async () => {
    // GIVEN
    const deadline = new Date(fakeNow);
    deadline.setHours(deadline.getHours() + 2);

    const addEnvironmentProvisionJob = constructProvisionRequestForCsp(CSP_A, cspAAddEnvironmentRequestNewSchema);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: CSP_A, uri: CSP_A_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );

    const transformedRequest = {
      environment: cspAAddEnvironmentRequestNewSchema.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };

    const transformedResponse = {
      environment: {
        ...cspAAddEnvironmentRequestNewSchema.payload,
        id: TEST_ENVIRONMENT_ID,
      },
    };

    const expectedResponse = {
      code: 200,
      content: {
        request: {
          environment: cspAAddEnvironmentRequestNewSchema.payload,
          portfolioId: addEnvironmentProvisionJob.portfolioId,
          provisionDeadline: deadline.toISOString(),
        },
        response: {
          ...transformedResponse,
          $metadata: {
            request: {
              ...transformedRequest,
              provisionDeadline: deadline.toISOString(),
            },
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

  it("should return a 200 for CSP_A requests new schema and omit deadline", async () => {
    // GIVEN

    const addEnvironmentProvisionJob = constructProvisionRequestForCsp(CSP_A, cspAAddEnvironmentRequestNewSchemaIsMigration);
    mockedConfig.mockImplementation(() => Promise.resolve({ name: CSP_A, uri: CSP_A_TEST_ENDPOINT }));
    mockedGetToken.mockImplementation(() =>
      Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
    );

    const transformedRequest = {
      environment: cspAAddEnvironmentRequestNewSchemaIsMigration.payload,
      portfolioId: addEnvironmentProvisionJob.portfolioId,
    };

    const transformedResponse = {
      environment: {
        ...cspAAddEnvironmentRequestNewSchemaIsMigration.payload,
        id: TEST_ENVIRONMENT_ID,
      },
    };

    const expectedResponse = {
      code: 200,
      content: {
        request: {
          environment: cspAAddEnvironmentRequestNewSchemaIsMigration.payload,
          portfolioId: addEnvironmentProvisionJob.portfolioId,
        },
        response: {
          ...transformedResponse,
          $metadata: {
            request: {
              ...transformedRequest,
            },
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
});

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
