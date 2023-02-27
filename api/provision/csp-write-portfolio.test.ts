import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { HothProvisionRequest } from "../../models/provisioning-jobs";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-create-environment";
import { cspAAddPortfolioRequest } from "../util/common-test-fixtures";
import * as client from "../client";
import * as types from "../client/types";
import { ProvisionCspResponse } from "../client";

// Reused mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
mockedConfig.mockImplementation(() => Promise.resolve({ name: "test", uri: "https://csp.example.com/atat/api/test" }));
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;
mockedGetToken.mockImplementation(() =>
  Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
);

beforeEach(() => {
  jest.resetAllMocks();
});

// Skipped because this covers old mock behavior
describe("Add Portfolio Tests", () => {
  describe("Successful invocation of mock CSP function", () => {
    // TODO: fix this
    it.skip("should return 200 when CSP A provided in the request", async () => {
      const response = await handler(cspAAddPortfolioRequest, {} as Context);
      if (!(response instanceof ValidationErrorResponse)) {
        expect(response.code).toBe(SuccessStatusCode.OK);
      }
    });
  });

  // TODO: Add tests to cover the actual logic in csp-create-environment.ts, but not beyond it
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
