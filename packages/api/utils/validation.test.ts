import {
  mockPortfolioStep,
  mockPortfolioStepMissingFields,
  mockValidPortfolioSteps,
} from "../portfolioDrafts/portfolio/commonPortfolioMockData";
import { isBodyPresent, isPathParameterPresent, isPortfolioStep } from "./validation";

describe("Testing validation of request body", () => {
  it("should return true because request body is present", async () => {
    const requestBody = {
      name: "test name",
    };
    expect(isBodyPresent(JSON.stringify(requestBody))).toEqual(true);
  });

  it("should return false because request body is empty JSON", async () => {
    const emptyJsonBody = {}; // empty JSON
    expect(isBodyPresent(JSON.stringify(emptyJsonBody))).toEqual(false);
  });

  it("should return false when body is empty object", async () => {
    expect(isBodyPresent(" { } ")).toEqual(false);
  });

  it("should return false because request body is an empty String", async () => {
    expect(isBodyPresent("")).toEqual(false);
  });

  it("should return false because request body is empty whitespace String", async () => {
    const emptyWhiteSpaceStringBody = "         "; // String body with only whitespace characters
    expect(isBodyPresent(emptyWhiteSpaceStringBody)).toEqual(false);
  });

  it("should return false because request body is null", async () => {
    expect(isBodyPresent(null)).toEqual(false);
  });
});

describe("Validation tests for createPortfolioStep function", () => {
  it("should map body to portfolioStep object", async () => {
    expect(isPortfolioStep(mockPortfolioStep)).toEqual(true);
  });
  it.each(mockValidPortfolioSteps)("should map body to portfolioStep object", async (mockPortfolioStep) => {
    expect(isPortfolioStep(mockPortfolioStep)).toEqual(true);
  });
  it.each(mockPortfolioStepMissingFields)(
    "should reject PortfolioStep objects missing required attributes",
    async (missingRequiredFieldObject) => {
      expect(isPortfolioStep(missingRequiredFieldObject)).toEqual(false);
    }
  );
  it("should fail to map body to portfolioStep object because request body is null", async () => {
    expect(isPortfolioStep(null)).toEqual(false);
  });
});

describe("Testing validation of path parameter", () => {
  it("should return false because path parameter is an empty string", async () => {
    const pathParam = "";
    expect(isPathParameterPresent(pathParam)).toEqual(false);
  });
  it("should return true because path parameter is a valid string", async () => {
    const pathParam = "valid path parameter";
    expect(isPathParameterPresent(pathParam)).toEqual(true);
  });
  it("should return false because path parameter is undefined", async () => {
    const pathParam = undefined;
    expect(isPathParameterPresent(pathParam)).toEqual(false);
  });
});
