import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getPortfolioStepCommand } from "../utils/commands/getPortfolioStepCommand";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});
describe("Dynamodb mock validation", function () {
  it("should get user names from the DynamoDB", async () => {
    const mockResponse = {
      updated_at: "2021-08-13T20:55:02.595Z",
      created_at: "2021-08-13T20:51:45.979Z",
      portfolio_step: {
        name: "alskdjflka",
        description: "Zach's portfolio description",
        portfolio_managers: [Array],
        dod_components: [Array],
      },
      num_portfolio_managers: 0,
      status: "not_started",
      id: "595c31d3-190c-42c3-a9b6-77325fa5ed38",
    };
    ddbMock.on(GetCommand).resolves({
      Item: mockResponse,
    });

    const data = await getPortfolioStepCommand("mock-table", "595c31d3-190c-42c3-a9b6-77325fa5ed38");
    expect(data.Item).toStrictEqual(mockResponse);
  });
});
