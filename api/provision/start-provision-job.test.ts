import { Context } from "aws-lambda";
import { handler } from "./start-provision-job";
import { CloudServiceProvider, Network } from "../../models/cloud-service-providers";
import { ProvisionRequestType } from "../../models/provisioning-jobs";
import { ApiSuccessResponse, ValidationErrorResponse } from "../../utils/response";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { mockClient } from "aws-sdk-client-mock";

const sfnMock = mockClient(sfnClient);
beforeEach(() => {
  sfnMock.reset();
});

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

export const requestContext = { identity: { sourceIp: "203.0.113.0" } };

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
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    console.log("TROUBLESHOOTING: ", response);
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
              clin: "0001",
              popStartDate: "2021-10-01",
              popEndDate: "2022-12-31",
            },
          ],
        },
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
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
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
});

describe("Failed provision operations", () => {
  it("should return a 400 due to unknown operationType (validation error)", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        operationType: "unknown",
        payload: {
          operators,
        },
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
  });
  it("should return a 400 when no portfolioId for ADD FUNDS/OPERATOR operationType (validation error)", async () => {
    const request = {
      body: {
        ...provisioningBodyNoPayload,
        portfolioId: null,
        payload: {
          operators,
        },
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    const responseBody = JSON.parse(response?.body ?? "");
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.errorMap.issue).toBe("CSP portfolio ID required.");
  });
});
