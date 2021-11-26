import { Context } from "aws-lambda";
import { validRequest } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { handler } from "./createPortfolioDraft";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { ProvisioningStatus } from "../models/ProvisioningStatus";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Console log IP for createPortfolioDraft", function () {
  it("should console log the sourceIP", async () => {
    const now = new Date().toISOString();
    ddbMock.on(PutCommand).resolves({
      Attributes: {
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        name: "",
        description: "",
        num_portfolio_managers: 0,
        num_task_orders: 0,
        num_applications: 0,
        num_environments: 0,
        status: ProvisioningStatus.NOT_STARTED,
      },
    });
    const request: any = {
      ...validRequest,
      body: JSON.stringify({}),
      requestContext: { identity: { sourceIp: "10.2.2.2" } },
    };
    const consoleLogSpy = jest.spyOn(console, "log");
    await handler(request, {} as Context, () => null);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
