import { validateRequestShape } from "../utils/requestValidation";
import { PortfolioStep } from "../models/PortfolioStep";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { v4 as uuidv4 } from "uuid";
import { isPortfolioStep } from "./validation";

describe("Shape validation tests", () => {
  const undefinedBodyEvent: ApiGatewayEventParsed<PortfolioStep> = {
    body: undefined,
    pathParameters: { portfolioDraftId: uuidv4() },
  } as any;
  const shouldBeEmptyBodyEvent: ApiGatewayEventParsed<PortfolioStep> = {
    body: { hi: "this is not empty" },
    pathParameters: { portfolioDraftId: uuidv4() },
  } as any;
  it("should throw error if request body invalid", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    // jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
    expect(() => {
      validateRequestShape<PortfolioStep>(undefinedBodyEvent);
    }).toThrow(Error("Shape validation failed, invalid request body"));
  });
  it("should throw error if request body is not a portfolio step", async () => {
    jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output

    expect(() => {
      validateRequestShape<PortfolioStep>(shouldBeEmptyBodyEvent, isPortfolioStep);
    }).toThrow(Error("Shape validation failed, invalid request body"));
  });
});
