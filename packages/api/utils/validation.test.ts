import {
  isBodyPresent,
  isFundingStep,
  isPathParameterPresent,
  isPortfolioStep,
  isValidJson,
  isValidDate,
  isClin,
  isClinNumber,
} from "./validation";

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
    {
      // task_order_number: "1234567890",
      task_order_file: toFile,
      csp: "aws",
      clins: [fakeClinData],
    },
    {
      task_order_number: "1234567890",
      // task_order_file: toFile,
      csp: "aws",
      clins: [fakeClinData],
    },
    {
      task_order_number: "1234567890",
      task_order_file: toFile,
      // csp: "aws",
      clins: [fakeClinData],
    },
    {
      task_order_number: "1234567890",
      task_order_file: toFile,
      csp: "aws",
      // clins: [fakeClinData],
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

describe("isValidDate()", function () {
  it("should validate these strings", () => {
    expect(isValidDate("1970-01-01")).toEqual(true);
    expect(isValidDate(new Date().toISOString())).toEqual(true);
  });
  it("should not validate these strings", () => {
    expect(isValidDate("")).toEqual(false);
    expect(isValidDate("not an ISO date")).toEqual(false);
    expect(isValidDate(NaN.toString())).toEqual(false);
  });
});

describe("isClin()", function () {
  const mockClin = {
    clin_number: "0001",
    idiq_clin: "002",
    total_clin_value: 100000,
    obligated_funds: 10000,
    pop_start_date: "2021-07-01",
    pop_end_date: "2022-07-01",
  };
  const badClins = [
    {
      // clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 100000,
      obligated_funds: 10000,
      pop_start_date: "2021-07-01",
      pop_end_date: "2022-07-01",
    },
    {
      clin_number: "0001",
      // idiq_clin: "002",
      total_clin_value: 100000,
      obligated_funds: 10000,
      pop_start_date: "2021-07-01",
      pop_end_date: "2022-07-01",
    },
    {
      clin_number: "0001",
      idiq_clin: "002",
      // total_clin_value: 100000,
      obligated_funds: 10000,
      pop_start_date: "2021-07-01",
      pop_end_date: "2022-07-01",
    },
    {
      clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 100000,
      // obligated_funds: 10000,
      pop_start_date: "2021-07-01",
      pop_end_date: "2022-07-01",
    },
    {
      clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 100000,
      obligated_funds: 10000,
      // pop_start_date: "2021-07-01",
      pop_end_date: "2022-07-01",
    },
    {
      clin_number: "0001",
      idiq_clin: "002",
      total_clin_value: 100000,
      obligated_funds: 10000,
      pop_start_date: "2021-07-01",
      // pop_end_date: "2022-07-01",
    },
  ];
  it("should reject a non-object", () => {
    expect(isClin(undefined)).toEqual(false);
    expect(isClin(null)).toEqual(false);
    expect(isClin("")).toEqual(false);
    expect(isClin(0)).toEqual(false);
  });
  it("should reject an empty object", () => {
    expect(isClin({})).toEqual(false);
  });
  it("should accept an object that looks like a Clin", () => {
    expect(isClin(mockClin)).toEqual(true);
  });
  it.each(badClins)("should reject a Clin missing any field", async (badClin) => {
    expect(isClin(badClin)).toEqual(false);
  });
});

describe("isClinNumber()", function () {
  const goodClinNumbers = ["0001", "0010", "0500", "5000", "9999"];
  it.each(goodClinNumbers)("should reject a clin number with incorrect length or not in valid range", (num) => {
    expect(isClinNumber(num)).toEqual(true);
  });
  const badClinNumbers = ["", "0", "1", "02", "111", "0000", "10000", "99999"];
  it.each(badClinNumbers)("should reject a clin number with incorrect length or not in valid range", (num) => {
    expect(isClinNumber(num)).toEqual(false);
  });
});
