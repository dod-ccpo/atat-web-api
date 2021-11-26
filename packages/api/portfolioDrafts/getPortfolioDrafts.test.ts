import { Context } from "aws-lambda";
import { validRequest } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { handler } from "./getPortfolioDrafts";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Console log IP for getPortfolioDrafts", function () {
  it("should console log the sourceIP", async () => {
    ddbMock.on(PutCommand).resolves({
      Attributes: {},
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
