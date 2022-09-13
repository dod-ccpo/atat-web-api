import { Context } from "aws-lambda";
import * as idpClient from "../../idp/client";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import { ErrorStatusCode, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import * as cspConfig from "./csp-configuration";
import { handler } from "./csp-write-portfolio";
import {
  provisioningBodyNoPayload,
  provisioningBodyWithPayload,
  fundingSources,
  operators,
  cspA,
} from "../util/common-test-fixtures";

// Reused mocks
jest.mock("./csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;

// Skipped because this covers old mock behavior
describe.skip("Successful invocation of mock CSP function", () => {
  it("should return 200 when CSP A provided in the request", async () => {
    const response = await handler(constructProvisionRequestForCsp("CSP_A"), {} as Context);
    if (!(response instanceof ValidationErrorResponse)) {
      expect(response.code).toBe(SuccessStatusCode.OK);
    }
  });
  it("should basically just return a reformatted CSP response", async () => {
    // GIVEN
    const request = constructProvisionRequestForCsp("CSP_E");
    const expectedResponse = {
      totally: "fake",
      csp: "response",
    };
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    mockedConfig.mockResolvedValueOnce({ uri: cspA.uri });

    // mockedAxios.post.mockResolvedValueOnce({
    //   data: expectedResponse,
    //   status: 200,
    //   statusText: "OK",
    //   headers: { "Content-Type": "application/json" },
    //   config: {},
    // });
    // jest.spyOn(client.AtatClient.prototype, "getCostsByPortfolio").mockImplementation(() => {
    //   return Promise.resolve({
    //     $metadata: { status: 200, response: { costs: FAKE_COST_DATA }, request: {} },
    //     costs: FAKE_COST_DATA,
    //   } as GetCostsByPortfolioResponse);
    // });

    // WHEN
    const response = await handler(request, {} as Context);

    // THEN
    expect(response).toEqual({
      code: 200,
      content: { response: expectedResponse, request },
    });
  });
});

// This test is skipped because it covers the old mock behavior
describe.skip("Failed invocation operations", () => {
  it.each([
    { desc: "empty", request: {} },
    { desc: "undefined", request: undefined },
    { desc: "missing endpoint", request: { cspInvocation: {} } },
  ])("should return a 400 when the request body is $desc", async ({ request }) => {
    const response = (await handler(request as ProvisionRequest, {} as Context)) as ValidationErrorResponse;
    expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });

  it("should return a 400 when the CSP's configuration is unknown", async () => {
    // GIVEN
    const request = constructProvisionRequestForCsp("CSP_DNE");
    mockedConfig.mockResolvedValueOnce(undefined);
    // WHEN
    const response = await handler(request, {} as Context);
    // THEN
    expect(response).toEqual({
      code: 400,
      content: {
        response: { details: "Invalid CSP provided" },
        request,
      },
    });
  });
  it("should basically just return a reformatted CSP response", async () => {
    // GIVEN
    const request = constructProvisionRequestForCsp("CSP_E");
    const expectedResponse = {
      totally: "fake",
      csp: "response",
    };
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    mockedConfig.mockResolvedValueOnce({ uri: cspA.uri });
    // mockedAxios.post.mockResolvedValueOnce({
    //   data: expectedResponse,
    //   status: 400,
    //   statusText: "Bad Request",
    //   headers: { "Content-Type": "application/json" },
    //   config: {},
    // });

    // WHEN
    const response = await handler(request, {} as Context);

    // THEN
    expect(response).toEqual({
      code: 400,
      content: { response: expectedResponse, request },
    });
  });

  it("should return a 400 when CSP_B is provided in the request", async () => {
    const response = await handler(constructProvisionRequestForCsp("CSP_B"), {} as Context);
    if (!(response instanceof ValidationErrorResponse)) {
      expect(response?.code).toBe(ErrorStatusCode.BAD_REQUEST);
    }
  });

  it("should return a 400 when additional payload property due to validation error", async () => {
    const cspABody = {
      ...provisioningBodyNoPayload,
      payload: {
        random: "property", // wrong property
        fundingSources,
        operators,
      },
      targetCsp: cspA,
    };
    const response = await handler(
      {
        ...cspABody,
      },
      {} as Context
    );
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    if (response instanceof ValidationErrorResponse) {
      expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    }
  });
  it("should throw a 500 error when a CSP internal error occurs", async () => {
    const request = constructProvisionRequestForCsp("CSP_C");
    expect(async () => await handler(request, {} as Context)).rejects.toThrow(
      JSON.stringify({
        code: ErrorStatusCode.INTERNAL_SERVER_ERROR,
        content: { response: { some: "internal error" }, request },
      })
    );
  });
});

export function constructProvisionRequestForCsp(csp: string): ProvisionRequest {
  const body = {
    ...provisioningBodyWithPayload,
    targetCsp: {
      ...cspA,
      name: csp,
    },
  };
  return {
    ...body,
  };
}
