import axios from "axios";
import * as idpClient from "../../idp/client";
import { Network } from "../../models/cloud-service-providers";
import { CostRequest } from "../../models/cost-jobs";
import { ErrorStatusCode, SuccessStatusCode } from "../../utils/response";
import { validRequestBody } from "../cost/cost-request-fn.test";
import * as cspConfig from "../provision/csp-configuration";
import { constructProvisionRequestForCsp } from "../provision/csp-write-portfolio.test";
import { CspRequest, cspRequest, CostRequestType, ProvisionRequestType } from "./csp-request";

// Reused mocks
jest.mock("../provision/csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;

describe("Successful invocation of mock CSP function", () => {
  const fakeGoodResponse = { fake: "csp response" };
  it("should return 200 when COST csp request", async () => {
    // GIVEN
    const request: CostRequestType = { requestType: CspRequest.COST, body: validRequestBody };
    mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
    mockedAxios.post.mockResolvedValueOnce({
      data: fakeGoodResponse,
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      config: {},
    });
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    // WHEN
    const response = await cspRequest(request);
    // THEN
    expect(response.content).toBe(fakeGoodResponse);
    expect(response.code).toBe(SuccessStatusCode.OK);
  });
  it("should return 200 when PROVISION csp request", async () => {
    // GIVEN
    const provisioningRequest = constructProvisionRequestForCsp("CSP_A");
    const request: ProvisionRequestType = { requestType: CspRequest.PROVISION, body: provisioningRequest };
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
    mockedAxios.post.mockResolvedValueOnce({
      data: fakeGoodResponse,
      status: 200,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" },
      config: {},
    });
    // WHEN
    const response = await cspRequest(request);
    // THEN
    expect(response.content).toBe(fakeGoodResponse);
    expect(response.code).toBe(SuccessStatusCode.OK);
  });
});

describe("Failed CSP invocation operations", () => {
  it.each([
    { desc: "empty", request: {} },
    { desc: "undefined", request: undefined },
    { desc: "missing endpoint", request: { cspInvocation: {} } },
  ])("should return a 400 when the request body is $desc", async ({ request }) => {
    const response = await cspRequest({ requestType: CspRequest.COST, body: request as CostRequest });
    expect(response.code).toBe(ErrorStatusCode.BAD_REQUEST);
  });
  it.each([CspRequest.COST, CspRequest.PROVISION])(
    "should return a 400 when the CSP's configuration is unknown",
    async (requestType) => {
      // GIVEN
      mockedConfig.mockResolvedValueOnce(undefined);
      // WHEN
      const response = await cspRequest({
        requestType,
        body: {
          ...validRequestBody,
          targetCsp: { name: "CSP_BAD", uri: "https://csp.com", network: Network.NETWORK_1 },
        },
      } as any);
      // THEN
      expect(response).toEqual({
        code: 400,
        content: {
          details: "Invalid CSP provided",
        },
      });
    }
  );
  it.each([CspRequest.COST, CspRequest.PROVISION])(
    "should basically return an error from the CSP",
    async (requestType) => {
      // GIVEN
      const fakeBadResponse = { bad: "fake csp response" };
      const request: any = { requestType, body: validRequestBody };
      mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
      mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
      mockedAxios.post.mockResolvedValueOnce({
        data: fakeBadResponse,
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
        config: {},
      });
      // WHEN
      const response = await cspRequest(request);
      // THEN
      expect(response).toEqual({
        code: 400,
        content: fakeBadResponse,
      });
    }
  );
  it.each([CspRequest.COST, CspRequest.PROVISION])(
    "should throw a 500 error when a CSP internal error occurs",
    async (requestType) => {
      const internalErrorResponse = { some: "internal error" };
      const request: any = { requestType, body: validRequestBody };
      mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
      mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
      mockedAxios.post.mockResolvedValueOnce({
        data: internalErrorResponse,
        status: 500,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
        config: {},
      });
      const response = await cspRequest(request);
      expect(response).toEqual({
        code: ErrorStatusCode.INTERNAL_SERVER_ERROR,
        content: internalErrorResponse,
      });
    }
  );
});
