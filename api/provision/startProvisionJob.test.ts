import { Context } from "aws-lambda";
import { handler } from "./startProvisionJob";
import { CloudServiceProvider, Network } from "../../models/CloudServiceProviders";
import { ProvisionRequestType } from "../../models/Provisioning";
import { ApiSuccessResponse, ValidationErrorResponse } from "../../utils/response";

const fundingSources = [
  {
    taskOrderNumber: "1234567890123",
    clinNumber: "9999",
    popStartDate: "2021-07-01",
    popEndDate: "2022-07-01",
  },
];
const operators = ["admin1@mail.mil", "superAdmin@mail.mil"];
const provisioningBodyNoPayload = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  operationType: ProvisionRequestType.ADD_PORTFOLIO,
  targetCsp: CloudServiceProvider.CSP_A,
  targetNetwork: Network.NETWORK_1,
};

describe("Successful provisioning operations", () => {
  it("should add a new portfolio", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        payload: {
          name: "Sample Portfolio",
          fundingSources,
          operators,
        },
      },
      requestContext: { identity: { sourceIp: "9.9.9.9" } },
    } as any;
    const response = await handler(request, {} as Context, () => null);
    console.log(response);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
  it("should add a funding source to existing portfolio", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        operationType: ProvisionRequestType.ADD_FUNDING_SOURCE,
        payload: {
          fundingSources: [
            ...fundingSources,
            {
              taskOrderNumber: "1234567890123",
              clinNumber: "0001",
              popStartDate: "2021-10-01",
              popEndDate: "2022-12-31",
            },
          ],
        },
      },
      requestContext: { identity: { sourceIp: "9.9.9.9" } },
    } as any;
    const response = await handler(request, {} as Context, () => null);
    console.log(response);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
  it("should add operators to existing portfolio", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        operationType: ProvisionRequestType.ADD_OPERATORS,
        payload: {
          operators: [...operators, "root.admin@mail.mil"],
        },
      },
      requestContext: { identity: { sourceIp: "9.9.9.9" } },
    } as any;
    const response = await handler(request, {} as Context, () => null);
    console.log(response);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
});

describe("Failed provision operations", () => {
  it("should return a 400 due to validation error", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        operationType: "unknown",
        payload: {
          operators,
        },
      },
      requestContext: { identity: { sourceIp: "9.9.9.9" } },
    } as any;
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
  });
});
