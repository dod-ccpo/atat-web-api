import { APIGatewayProxyEvent } from "aws-lambda";
import { isValidJson, isBodyPresent, isPortfolioStep } from "../utils/validation";
import { handler, EMPTY_REQUEST_BODY } from "../portfolio/createPortfolioStep";
describe("Testing validation of request body", function () {
  it("should return false because request body is empty JSON", async () => {
    const emptyJsonBody = {}; // empty JSON
    const event = {
      body: JSON.stringify(emptyJsonBody),
    } as APIGatewayProxyEvent;
    expect(isBodyPresent(event.body)).toEqual(false);
  });

  it("should return false because request body is an empty String", async () => {
    const emptyStringBody = ""; // empty String body
    const event = {
      body: emptyStringBody,
    } as APIGatewayProxyEvent;

    expect(isBodyPresent(event.body)).toEqual(false);
  });

  it("should return false because request body is empty whitespace String", async () => {
    const emptyWhiteSpaceStringBody = "         "; // String body with only whitespace characters
    const event = {
      body: emptyWhiteSpaceStringBody,
    } as APIGatewayProxyEvent;

    expect(isBodyPresent(event.body)).toEqual(false);
  });

  it("should return false because request body is null", async () => {
    const event = {
      body: null,
    } as APIGatewayProxyEvent;

    expect(isBodyPresent(event.body)).toEqual(false);
  });

  it("should return false because request body JSON is invalid", async () => {
    const invalidJsonBody = `{"hi": "123",}`; // comma at end
    expect(isValidJson(invalidJsonBody)).toEqual(false);
    const invalidJsonBody2 = `{"hi": "123}`; // missing closing quote
    expect(isValidJson(invalidJsonBody2)).toEqual(false);
    const invalidJsonBody3 = `{hi: 123}`; // need quotes around hi
    expect(isValidJson(invalidJsonBody3)).toEqual(false);
    const invalidJsonBody4 = `{"hi" "123"}`; // missing ':'
    expect(isValidJson(invalidJsonBody4)).toEqual(false);
  });
});

describe("Validation tests for createPortfolioStep function", function () {
  it("should map body to portfolioStep object", async () => {
    const requestBody = {
      name: "Zach's portfolio name",
      description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBody)).toEqual(true);
  });
  it("should fail to map body to portfolioStep object due to missing attribute", async () => {
    const requestBodyMissingDescription = {
      name: "Zach's portfolio name",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBodyMissingDescription)).toEqual(false);
  });
  it("should fail to map body to portfolioStep object due to missing attribute", async () => {
    const requestBodyMissingDescription = {
      name: "Zach's portfolio name",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBodyMissingDescription)).toEqual(false);
  });

  it("should fail to map body to portfolioStep object due to missing attribute", async () => {
    const requestBodyMissingDescription = {
      name: "Zach's portfolio name",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBodyMissingDescription)).toEqual(false);
  });

  // fix this test
  /*
  it("should fail to map body to portfolioStep object due to incorrect data type", async () => {
    const requestBodyMissingDescription = {
      name: 12345,
      description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: "joe.manager@example.com",
    };
    expect(isPortfolioStep(requestBodyMissingDescription)).toEqual(false);
  }); */
});
