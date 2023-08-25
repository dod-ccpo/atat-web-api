import { Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { sfnClient } from "../../utils/aws-sdk/step-functions";
import { ApiSuccessResponse, ValidationErrorResponse } from "../../utils/response";
import { administrators, cspAProvisioningBodyNoPayload, taskOrders, validRequest } from "../util/common-test-fixtures";
import { handler } from "./start-provisioning-job";
import { ProvisionRequestType } from "../client";

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
        ...cspAProvisioningBodyNoPayload,
        operationType: ProvisionRequestType.ADD_TASK_ORDER,
        payload: {
          ...[taskOrders[0]],
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
        ...cspAProvisioningBodyNoPayload,
        operationType: ProvisionRequestType.ADD_ADMINISTRATOR,
        payload: {
          administrators: [
            ...administrators,
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
        ...cspAProvisioningBodyNoPayload,
        operationType: "unknown",
        payload: {
          administrators,
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
});
