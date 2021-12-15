import { validateRequestShape, validatingRequestShape } from "../utils/requestValidation";
import { PortfolioStep } from "../models/PortfolioStep";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { v4 as uuidv4 } from "uuid";
import { isPortfolioStep } from "./validation";
import { IEnvironment } from "../../orm/entity/Environment";

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

describe("Shape validation tests", () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  const validEventRequest: ApiGatewayEventParsed<IEnvironment> = {
    body: { name: "env name" },
    pathParameters: { portfolioId: uuidv4(), applicationId: uuidv4() },
  } as any;
  const undefinedBodyEvent: ApiGatewayEventParsed<IEnvironment> = {
    body: undefined,
    pathParameters: { portfolioId: uuidv4() },
  } as any;
  const invalidUuidv4: ApiGatewayEventParsed<IEnvironment> = {
    body: { name: "env name" },
    pathParameters: { portfolioId: uuidv4(), applicationId: "not uuidv4" },
  } as any;

  it("should return a SetupSuccess object", async () => {
    expect(validatingRequestShape<IEnvironment>(validEventRequest)).toEqual({
      bodyObject: validEventRequest.body,
      path: validEventRequest.pathParameters,
    });
  });
  it("should throw error if request body invalid", async () => {
    expect(() => {
      validatingRequestShape<IEnvironment>(undefinedBodyEvent);
    }).toThrow(Error("Shape validation failed, invalid request body"));
  });
  it("should throw error if invalid UUIDv4", async () => {
    expect(() => {
      validatingRequestShape<IEnvironment>(invalidUuidv4);
    }).toThrow(Error("Shape validation failed, invalid UUIDv4"));
  });
});
