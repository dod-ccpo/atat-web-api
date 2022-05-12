import { Context } from "aws-lambda";
import { handler } from "./csp-write-portfolio";
import { Network } from "../../models/cloud-service-providers";
import { ProvisionRequest } from "../../models/provisioning-jobs";
import {
  ErrorResponse,
  ErrorStatusCode,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../../utils/response";
import { transformProvisionRequest } from "./start-provisioning-job";
import { provisioningBodyNoPayload, provisioningBodyWithPayload } from "./start-provisioning-job.test";
import axios from "axios";
import * as cspConfig from "./csp-configuration";
import * as idpClient from "../../idp/client";
import { GetSecretValueCommand, SecretsManager } from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
jest.mock("./csp-configuration");
const mockedConfig = cspConfig.getConfiguration as jest.MockedFn<typeof cspConfig.getConfiguration>;
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock("../../idp/client");
const mockedGetToken = idpClient.getToken as jest.MockedFn<typeof idpClient.getToken>;

const fundingSources = [
  {
    taskOrderNumber: "1234567890123",
    clin: "9999",
    popStartDate: "2021-07-01",
    popEndDate: "2022-07-01",
  },
];
const operators = ["admin1@mail.mil", "superAdmin@mail.mil"];

describe("Successful invocation of mock CSP function", () => {
  it("should return 200 when CSP A provided in the request", async () => {
    const response = await handler(constructProvisionRequestForCsp("CSP_A"), {} as Context);
    if (!(response instanceof ValidationErrorResponse)) {
      expect(response.code).toBe(SuccessStatusCode.OK);
    }
  });
  it("should basically just return a reformatted CSP response", async () => {
    // GIVEN
    const expectedResponse = {
      totally: "fake",
      csp: "response",
    };
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
    mockedAxios.post.mockResolvedValueOnce({
      data: expectedResponse,
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      config: {},
    });

    // WHEN
    const response = await handler(constructProvisionRequestForCsp("CSP_E"), {} as Context);

    // THEN
    expect(response).toEqual({
      code: 200,
      content: expectedResponse,
    });
  });
});

describe("Failed invocation operations", () => {
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
    mockedConfig.mockResolvedValueOnce(undefined);
    // WHEN
    const response = await handler(constructProvisionRequestForCsp("CSP_DNE"), {} as Context);
    // THEN
    expect(response).toEqual({
      code: 400,
      content: {
        details: "Invalid CSP provided",
      },
    });
  });
  it("should basically just return a reformatted CSP response", async () => {
    // GIVEN
    const expectedResponse = {
      totally: "fake",
      csp: "response",
    };
    mockedGetToken.mockResolvedValueOnce({ access_token: "FakeToken", expires_in: 0, token_type: "Bearer" });
    mockedConfig.mockResolvedValueOnce({ uri: "https://mockcsp.cspa/atat/" });
    mockedAxios.post.mockResolvedValueOnce({
      data: expectedResponse,
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" },
      config: {},
    });

    // WHEN
    const response = await handler(constructProvisionRequestForCsp("CSP_E"), {} as Context);

    // THEN
    expect(response).toEqual({
      code: 400,
      content: expectedResponse,
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
      targetCsp: {
        name: "CSP_A",
        uri: "http://www.somecspvendor.com/api/atat",
        network: Network.NETWORK_1,
      },
    };
    const response = await handler(
      {
        ...cspABody,
        cspInvocation: transformProvisionRequest(cspABody),
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
        content: { some: "internal error" },
      })
    );
  });
});

function constructProvisionRequestForCsp(csp: string): ProvisionRequest {
  const body = {
    ...provisioningBodyWithPayload,
    targetCsp: {
      name: csp,
      uri: "http://www.somecspvendor.com/api/atat",
      network: Network.NETWORK_1,
    },
  };
  return {
    ...body,
    cspInvocation: transformProvisionRequest(body),
  };
}
