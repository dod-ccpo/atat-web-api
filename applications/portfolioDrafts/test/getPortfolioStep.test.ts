import { APIGatewayProxyEvent } from "aws-lambda";
import { isValidJson, isBodyPresent, isPortfolioStep, isPathParameterPresent } from "../utils/validation";
import { handler, EMPTY_REQUEST_BODY } from "../portfolio/createPortfolioStep";
import { PortfolioStep } from "../models/PortfolioStep";
import { createPortfolioStepCommand } from "../utils/commands/createPortfolioStepCommand";
import { UpdateCommand, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});
describe("Dynamodb mock validation", function () {
  it("should get user names from the DynamoDB", async () => {
    const meme = {
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
      Attributes: meme,
    });
    // setting up new request
    const requestBody = {
      name: "Zach's portfolio name",
      description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    const portfolioStep: PortfolioStep = requestBody;
    const data = await createPortfolioStepCommand(
      "Spaghetti-table",
      "595c31d3-190c-42c3-a9b6-77325fa5ed38",
      portfolioStep
    );
    console.log("da data", data.Attributes);
    console.log("da meme", meme);
    expect(data.Attributes).toEqual(meme);
    // console.log(result);
    // expect(data.Attributes).toStrictEqual(result);
  });
  /*
  it("should get user names from the DynamoDB", async () => {
    ddbMock
      .on(GetCommand)
      .resolves({
        Item: undefined,
      })
      .on(GetCommand, {
        TableName: "users",
        Key: { id: "user1" },
      })
      .resolves({
        Item: { id: "user1", name: "Alice" },
      })
      .on(GetCommand, {
        TableName: "users",
        Key: { id: "user2" },
      })
      .resolves({
        Item: { id: "user2", name: "Bob" },
      });
    const names = await getUserNames(["user1", "user2", "user3"]);
    expect(names).toStrictEqual(["Alice", "Bob", undefined]);
  });
  */
});

/*
import { APIGatewayProxyEvent } from "aws-lambda";
import { isValidJson, isBodyPresent, isPortfolioStep, isPathParameterPresent } from "../utils/validation";
import { handler, EMPTY_REQUEST_BODY } from "../portfolio/createPortfolioStep";
import { PortfolioStep } from "../models/PortfolioStep";
import { portfolioStepCommand } from "../utils/commands";
import { UpdateCommand, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getUserNames } from "../utils/getUserNames";

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => {
  ddbMock.reset();
});
describe("Dynamodb mock validation", function () {
  it("should get user names from the DynamoDB", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { id: "f5d2dba7-fc71-4b51-ad22-e3c23e7ac1fb", "created_at },
    });
    const names = await getUserNames(["user1"]);
    expect(names).toStrictEqual(["John"]);
  });
  it("should get user names from the DynamoDB", async () => {
    ddbMock
      .on(GetCommand)
      .resolves({
        Item: undefined,
      })
      .on(GetCommand, {
        TableName: "users",
        Key: { id: "user1" },
      })
      .resolves({
        Item: { id: "user1", name: "Alice" },
      })
      .on(GetCommand, {
        TableName: "users",
        Key: { id: "user2" },
      })
      .resolves({
        Item: { id: "user2", name: "Bob" },
      });
    const names = await getUserNames(["user1", "user2", "user3"]);
    expect(names).toStrictEqual(["Alice", "Bob", undefined]);
  });
});

*/
