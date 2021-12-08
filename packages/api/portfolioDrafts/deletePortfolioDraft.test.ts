import { Context } from "aws-lambda";
import { validRequest } from "../portfolioDrafts/commonPortfolioDraftMockData";
import { handler } from "./deletePortfolioDraft";
import { mockClient } from "aws-sdk-client-mock";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

describe("Console log IP for deletePortfolioDraft", function () {
  it("should console log the sourceIP", async () => {
    ddbMock.on(DeleteCommand).resolves({
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
