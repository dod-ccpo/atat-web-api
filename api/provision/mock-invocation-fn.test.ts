import { Context } from "aws-lambda";
import { handler } from "./mock-invocation-fn";
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
});

describe("Failed invocation operations", () => {
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
        payload: request,
      })
    );
  });
  it("should return a 400 when null", async () => {
    const response = await handler(undefined as any, {} as Context, () => null);
    expect(response).toBeInstanceOf(ErrorResponse);
    if (response instanceof OtherErrorResponse) {
      expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    }
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
