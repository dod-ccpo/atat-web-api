import { validateRequestShape } from "../utils/shapeValidator";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { v4 as uuidv4 } from "uuid";
import { Environment } from "../../orm/entity/Environment";
import { SetupSuccess } from "./response";

describe("Shape validation tests", () => {
  jest.spyOn(console, "error").mockImplementation(() => jest.fn()); // suppress output
  const validEventRequest: ApiGatewayEventParsed<Environment> = {
    body: { name: "env name" },
    pathParameters: { portfolioId: uuidv4(), applicationId: uuidv4(), environmentId: uuidv4() },
  } as any;
  const undefinedBodyEvent: ApiGatewayEventParsed<Environment> = {
    body: undefined,
    pathParameters: { portfolioId: uuidv4() },
  } as any;
  const invalidUuidv4: ApiGatewayEventParsed<Environment> = {
    body: { name: "env name" },
    pathParameters: { portfolioId: uuidv4(), applicationId: "not uuidv4" },
  } as any;

  it("should return a SetupSuccess object", async () => {
    const result = validateRequestShape<Environment>(validEventRequest);
    expect(result).toBeInstanceOf(SetupSuccess);
    expect(result).toEqual({
      bodyObject: validEventRequest.body,
      path: validEventRequest.pathParameters,
    });
  });
  it("should throw error if request body invalid", async () => {
    expect(() => {
      validateRequestShape<Environment>(undefinedBodyEvent);
    }).toThrow(Error("Shape validation failed, invalid request body"));
  });
  it("should throw error if invalid UUIDv4", async () => {
    expect(() => {
      validateRequestShape<Environment>(invalidUuidv4);
    }).toThrow(Error("Invalid path parameter"));
  });
});
