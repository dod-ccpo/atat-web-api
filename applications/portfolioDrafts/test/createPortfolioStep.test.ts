import { PortfolioStep } from "../models/PortfolioStep";
import { createPortfolioStepCommand } from "../utils/commands/createPortfolioStepCommand";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

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

    ddbMock.on(UpdateCommand).resolves({
      Attributes: mockResponse,
    });
    // setting up new request
    const requestBody = {
      name: "Zach's portfolio name",
      description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    const portfolioStep: PortfolioStep = requestBody;
    const data = await createPortfolioStepCommand("mock-table", "595c31d3-190c-42c3-a9b6-77325fa5ed38", portfolioStep);
    expect(data.Attributes).toEqual(mockResponse);
  });
});
