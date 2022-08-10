import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { ProvisionRequestType } from "../../models/provisioning-jobs";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { ApiSuccessResponse, ValidationErrorResponse } from "../../utils/response";
import {
  fundingSources,
  provisioningBodyNoPayload,
  validRequest,
  // requestContext,
  operators,
} from "../util/common-test-fixtures";
import { handler } from "./start-provisioning-job";

export const requestContext = { identity: { sourceIp: "203.0.113.0" } };
const sfnMock = mockClient(sfnClient);
beforeEach(() => {
  sfnMock.reset();
});

describe("Successful provisioning operations", () => {
  it("should add a new portfolio", async () => {
    const response = await handler(validRequest, {} as Context, () => null);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
  it("should add a funding source to existing portfolio", async () => {
    const request = {
      body: JSON.stringify({
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
      }),
      headers: {
        "Content-Type": "application/json",
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ApiSuccessResponse);
  });
  it("should add operators to existing portfolio", async () => {
    const request = {
      body: JSON.stringify({
        ...provisioningBodyNoPayload,
        operationType: ProvisionRequestType.ADD_OPERATORS,
        payload: {
          operators: [
            ...operators,
            {
              email: "root.admin@mail.mil",
              dodId: "9999999999",
              needsReset: false,
            },
          ],
        },
      }),
      headers: {
        "Content-Type": "application/json",
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
      body: JSON.stringify({
        ...provisioningBodyNoPayload,
        operationType: "unknown",
        payload: {
          operators,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    expect(response).toBeInstanceOf(ValidationErrorResponse);
  });
  it("should return a 400 when no portfolioId for ADD FUNDS/OPERATOR operationType (validation error)", async () => {
    const request = {
      body: JSON.stringify({
        ...provisioningBodyNoPayload,
        portfolioId: null,
        payload: {
          operators,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      requestContext,
    } as any;
    const response = await handler(request, {} as Context, () => null);
    const responseBody = JSON.parse(response?.body ?? "");
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.errorMap.issue).toBe("CSP portfolio ID required.");
  });
});
