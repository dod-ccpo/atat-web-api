import { isBodyPresent, isFundingStep, isPathParameterPresent, isPortfolioStep, isValidJson } from "./validation";

describe("Testing validation of request body", function () {
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

  it("should return true because request body JSON is valid", async () => {
    const validJsonBody = `{"hi": "123"}`; // valid json
    expect(isValidJson(validJsonBody)).toEqual(true);
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
  it("should fail to map body to portfolioStep object because request body is null", async () => {
    expect(isPortfolioStep(null)).toEqual(false);
  });
});

describe("Testing validation of fundingStep objects", () => {
  const fakeClinData = {
    clin_number: "0100",
    idiq_clin: "1010",
    total_clin_value: 100000,
    obligated_funds: 1,
    pop_start_date: "2021-08-15",
    pop_end_date: "2022-08-15",
  };
  const toFile = { id: "1234", name: "testto.pdf" };
  const fundingStepLike = {
    task_order_number: "1234567890",
    task_order_file: toFile,
    csp: "aws",
    clins: [fakeClinData],
  };
  const badFundingSteps = [
    // Missing CLINs
    {
      task_order_number: "12345667890",
      task_order_file: toFile,
      csp: "aws",
    },
    // Missing TO number
    {
      task_order_file: toFile,
      csp: "aws",
      clins: [fakeClinData],
    },
    // Missing CSP
    {
      task_order_number: "1234567890",
      task_order_file: toFile,
      clins: [fakeClinData],
    },
    // Missing File Data
    {
      task_order_number: "12345667890",
      csp: "aws",
      clins: [fakeClinData],
    },
  ];
  it.each([true, 1, undefined, null])("should reject non-objects", async (item) => {
    expect(isFundingStep(item)).toEqual(false);
  });
  it("should accept a fundingStep-looking object", async () => {
    expect(isFundingStep(fundingStepLike)).toEqual(true);
  });
  it.each(badFundingSteps)("should reject a FundingStep missing any field", async (badStep) => {
    expect(isFundingStep(badStep)).toEqual(false);
  });
});

describe("Testing validation of path parameter", function () {
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
