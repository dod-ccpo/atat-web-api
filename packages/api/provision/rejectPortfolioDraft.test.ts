import { Context } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";
import { handler } from "./rejectPortfolioDraft";
import { mockPortfolioDraft } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { ProvisioningStatus } from "../models/ProvisioningStatus";

const ddbMock = mockClient(DynamoDBDocumentClient);
const consoleLogSpy = jest.spyOn(console, "log");
beforeEach(() => {
  ddbMock.reset();
  consoleLogSpy.mockReset();
});

describe("Reject provisioning Portfolio Draft handler", () => {
  it("should return a portfolio draft with a status of failed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    const validatedBadPortfolioDraft: any = {
      body: {
        ...mockPortfolioDraft,
        portfolio_step: {}, // no portfolio step
        submit_id: uuidv4(),
        status: ProvisioningStatus.IN_PROGRESS,
        validatedResult: "FAILED",
      },
    };
    const updatedPortfolioDraft = { ...validatedBadPortfolioDraft, status: ProvisioningStatus.FAILED };
    ddbMock.on(UpdateCommand).resolves(updatedPortfolioDraft);
    await handler(validatedBadPortfolioDraft, {} as Context);
    expect(consoleLogSpy).toBeCalledTimes(2);
    expect(consoleLogSpy).toBeCalledWith(`DB UPDATE RESULT (rejected): ${JSON.stringify(updatedPortfolioDraft)}`);
  });
});
