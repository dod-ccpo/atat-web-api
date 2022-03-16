import { Context } from "aws-lambda";
import { handler } from "./mock-invocation-fn";
import { CloudServiceProvider, Network } from "../../models/cloud-service-providers";
import { ProvisionRequestType } from "../../models/provisioning-jobs";
import { ErrorStatusCode, OtherErrorResponse, SuccessStatusCode, ValidationErrorResponse } from "../../utils/response";
import { transformProvisionRequest } from "./start-provision-job";

const fundingSources = [
  {
    taskOrderNumber: "1234567890123",
    clin: "9999",
    popStartDate: "2021-07-01",
    popEndDate: "2022-07-01",
  },
];
const operators = ["admin1@mail.mil", "superAdmin@mail.mil"];
const provisioningBodyNoPayload = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  operationType: ProvisionRequestType.ADD_OPERATORS,
  targetCsp: CloudServiceProvider.CSP_A.name,
  targetNetwork: Network.NETWORK_1,
};

describe("Successful invocation of mock CSP function", () => {
  it("should return 200 when CSP A provided in the request", async () => {
    const stateInput = transformProvisionRequest({
      ...provisioningBodyNoPayload,
      targetCsp: "CSP_A",
      payload: {
        name: "Mock A Invocation Portfolio",
        fundingSources,
        operators,
      },
    });
    const response = await handler(stateInput, {} as Context);
    if (!(response instanceof ValidationErrorResponse)) {
      expect(response.code).toBe(SuccessStatusCode.OK);
    }
  });
});

describe("Failed invocation operations", () => {
  it("should return a 400 when CSP_B is provided in the request", async () => {
    const stateInput = transformProvisionRequest({
      ...provisioningBodyNoPayload,
      targetCsp: "CSP_B",
      payload: {
        name: "Mock B Invocation Portfolio",
        fundingSources,
        operators,
      },
    });
    const response = await handler(stateInput, {} as Context);
    if (!(response instanceof ValidationErrorResponse)) {
      expect(response?.code).toBe(ErrorStatusCode.BAD_REQUEST);
    }
  });
  it("should return a 400 when additional payload property due to validation error", async () => {
    const stateInput = transformProvisionRequest({
      ...provisioningBodyNoPayload,
      targetCsp: "CSP_A",
      payload: {
        random: "property", // wrong property
        fundingSources,
        operators,
      },
    } as any);
    const response = await handler(stateInput, {} as Context);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    if (response instanceof ValidationErrorResponse) {
      expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    }
  });
  it("should throw a 500 error when a CSP internal error occurs", async () => {
    const stateInput = transformProvisionRequest({
      ...provisioningBodyNoPayload,
      targetCsp: "CSP_C",
      payload: {
        name: "Mock C Invocation Portfolio",
        fundingSources,
        operators,
      },
    });
    expect(async () => await handler(stateInput, {} as Context)).rejects.toThrow(
      JSON.stringify({
        code: ErrorStatusCode.INTERNAL_SERVER_ERROR,
        content: { some: "internal error" },
        payload: stateInput,
      })
    );
  });
  it("should return a 400 when null", async () => {
    const response = await handler(undefined as any, {} as Context, () => null);
    expect(response).toBeInstanceOf(OtherErrorResponse);
    if (response instanceof OtherErrorResponse) {
      expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
    }
  });
});
