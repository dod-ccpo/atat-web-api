import { Callback, Context } from "aws-lambda";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { v4 as uuidv4 } from "uuid";

import { ErrorStatusCode } from "../utils/response";
import { CloudServiceProvider } from "../models/CloudServiceProvider";
import { PortfolioStep } from "../models/PortfolioStep";
import { handler } from "./middyHandler";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});

const wrongEmailFormatPortfolioStep: PortfolioStep = {
  name: "Mock Portfolio",
  csp: CloudServiceProvider.AWS,
  description: "Mock portfolio description",
  dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
  portfolio_managers: ["joe.manager", "jane.manager@example.com"],
};

const validRequest = {
  body: JSON.stringify(wrongEmailFormatPortfolioStep),
  pathParameters: { portfolioDraftId: uuidv4() },
} as any;

describe("Testing the example middy handler", function () {
  it("should return error due invalid portfolio_managers email (checks format of email)", async () => {
    const result = await handler(validRequest, {} as Context, null as unknown as Callback)!;
    expect(result.statusCode).toEqual(ErrorStatusCode.BAD_REQUEST);
  });
});
