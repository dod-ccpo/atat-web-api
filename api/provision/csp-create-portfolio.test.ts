import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-create-portfolio";
import {
  constructProvisionRequestForCsp,
  CSP_A_TEST_ENDPOINT,
  cspAAddPortfolioRequest,
} from "../util/common-test-fixtures";
import { HothProvisionRequest, ProvisionCspResponse } from "../client";

// Reused mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;
mockedGetToken.mockImplementation(() =>
  Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Add Portfolio Tests", () => {
  describe("Successful invocation of mock CSP function", () => {
    it("should return 200 when CSP A provided in the request", async () => {
      mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_A", uri: CSP_A_TEST_ENDPOINT }));
      mockedGetToken.mockImplementation(() =>
        Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
      );
      const response = (await handler(
        constructProvisionRequestForCsp("CSP_A", cspAAddPortfolioRequest),
        {} as Context
      )) as ProvisionCspResponse;
      expect(response.code).toBe(SuccessStatusCode.OK);
    });
  });

  // TODO: Add negative expect clause for provision deadline
  // TODO: Add tests to cover the actual logic in csp-create-portfolio.ts, but not beyond it
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
