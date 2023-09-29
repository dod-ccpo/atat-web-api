import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { SuccessStatusCode, ErrorStatusCode } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-get-portfolio";
import {
  constructProvisionRequestForCsp,
  CSP_A_TEST_ENDPOINT,
  cspAGetPortfolioRequest,
  cspAGetPortfolioRequestBadId,
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

describe("Get Portfolio Tests", () => {
  describe("Successful invocation of mock CSP function", () => {
    it("should return 200 when CSP A provided in the request", async () => {
      mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_A", uri: CSP_A_TEST_ENDPOINT }));
      mockedGetToken.mockImplementation(() =>
        Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
      );

      const response = (await handler(
        constructProvisionRequestForCsp("CSP_A", cspAGetPortfolioRequest as HothProvisionRequest),
        {} as Context
      )) as ProvisionCspResponse;
      console.log(response);
      expect(response.code).toBe(SuccessStatusCode.OK);
    });
  });

  describe("Failed invocation operations", () => {
    it("should return a 404 when a bad PortfolioId is used", async () => {
      mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_A", uri: CSP_A_TEST_ENDPOINT }));
      mockedGetToken.mockImplementation(() =>
        Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
      );
      const response = (await handler(
        constructProvisionRequestForCsp("CSP_A", cspAGetPortfolioRequestBadId as HothProvisionRequest),
        {} as Context
      )) as ProvisionCspResponse;
      expect(response.code).toBe(ErrorStatusCode.NOT_FOUND);
    });
    it("should throw exception when no PortfolioId is used", async () => {
      mockedConfig.mockImplementation(() => Promise.resolve({ name: "CSP_A", uri: CSP_A_TEST_ENDPOINT }));
      mockedGetToken.mockImplementation(() =>
        Promise.resolve({ access_token: "FAKE_TOKEN", expires_in: 0, token_type: "Bearer" })
      );
      const emptyGetPortfolioRequest = cspAGetPortfolioRequest;
      emptyGetPortfolioRequest.portfolioId = "";
      const response = (await handler(
        constructProvisionRequestForCsp("CSP_A", emptyGetPortfolioRequest as HothProvisionRequest),
        {} as Context
      )) as ProvisionCspResponse;
      expect(response.code).toBe(ErrorStatusCode.NOT_FOUND);
    });
  });
});
