import { CloudServiceProvider } from "../models/CloudServiceProvider";
import {
  mockApplicationStep,
  mockApplicationStepsMissingFields,
  mockApplicationsMissingFields,
  mockApplicationCloudCityEvacPlanner,
  mockEnvironmentsMissingFields,
  mockApplicationJabbasPalaceExpansionApp,
} from "../portfolioDrafts/application/commonMockData";
import {
  isBodyPresent,
  isFundingStep,
  isTaskOrder,
  isPathParameterPresent,
  isPortfolioStep,
  isValidJson,
  isValidDate,
  isClin,
  isClinNumber,
  isFundingAmount,
  isApplicationStep,
  isApplication,
  isEnvironment,
  isOperator,
  isMilEmail,
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

  it("should return undefined because request body JSON is invalid", async () => {
    const invalidJsonBody = `{"hi": "123",}`; // comma at end
    expect(isValidJson(invalidJsonBody)).toEqual(undefined);
    const invalidJsonBody2 = `{"hi": "123}`; // missing closing quote
    expect(isValidJson(invalidJsonBody2)).toEqual(undefined);
    const invalidJsonBody3 = `{hi: 123}`; // need quotes around hi
    expect(isValidJson(invalidJsonBody3)).toEqual(undefined);
    const invalidJsonBody4 = `{"hi" "123"}`; // missing ':'
    expect(isValidJson(invalidJsonBody4)).toEqual(undefined);
  });

  it("should return true because request body JSON is valid", async () => {
    const validJsonBody = `{"hi": "123"}`; // valid json
    const mockResponse = {
      hi: "123",
    };
    expect(isValidJson(validJsonBody)).toEqual(mockResponse);
  });
});

describe("Validation tests for createPortfolioStep function", function () {
  it("should map body to portfolioStep object", async () => {
    const requestBody = {
      name: "Zach's portfolio name",
      csp: CloudServiceProvider.AWS,
      description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBody)).toEqual(true);
  });
  it("should accept PortfolioStep objects with a missing description", async () => {
    const requestBodyMissingDescription = {
      name: "Zach's portfolio name",
      csp: CloudServiceProvider.AWS,
      // description: "team america",
      dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
      portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
    };
    expect(isPortfolioStep(requestBodyMissingDescription)).toEqual(true);
  });
  it.each([
    {
      description: "Missing Name",
      body: {
        // name: "Zach's portfolio name",
        csp: CloudServiceProvider.AWS,
        description: "Test Portfolio",
        dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
        portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
      },
    },
    {
      description: "Missing CSP",
      body: {
        name: "Zach's portfolio name",
        // csp: CloudServiceProvider.AWS,
        description: "Test Portfolio",
        dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
        portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
      },
    },
    {
      description: "Missing Components",
      body: {
        name: "Zach's portfolio name",
        csp: CloudServiceProvider.AWS,
        description: "Test Portfolio",
        // dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
        portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
      },
    },
    {
      description: "Missing Portfolio Managers",
      body: {
        name: "Zach's portfolio name",
        csp: CloudServiceProvider.AWS,
        description: "Test Portfolio",
        dod_components: ["air_force", "army", "marine_corps", "navy", "space_force"],
        // portfolio_managers: ["joe.manager@example.com", "jane.manager@example.com"],
      },
    },
  ])("should reject PortfolioStep objects missing required attributes", async (badRequest) => {
    expect(isPortfolioStep(badRequest)).toEqual(false);
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
    task_orders: [
      {
        task_order_number: "1234567890",
        task_order_file: toFile,
        csp: "aws",
        clins: [fakeClinData],
      },
    ],
  };
  const badFundingSteps = [{}, { random_orders: "some task orders" }, ""];
  const badTaskOrders = [
    {
      // task_order_number: "1234567890",
      task_order_file: toFile,
      clins: [fakeClinData],
    },
    {
      task_order_number: "1234567890",
      // task_order_file: toFile,
      clins: [fakeClinData],
    },
    {
      task_order_number: "1234567890",
      task_order_file: toFile,
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
  it.each(badTaskOrders)("should reject a Task Orders missing any field", async (badTaskOrder) => {
    expect(isTaskOrder(badTaskOrder)).toEqual(false);
  });
  it.each([true, 1, undefined, null, "object"])("should reject non-objects", async (item) => {
    expect(isTaskOrder(item)).toEqual(false);
  });
});

describe("isApplicationStep()", () => {
  it.each([true, 1, undefined, null])("should reject non-objects", async (item) => {
    expect(isApplicationStep(item)).toEqual(false);
  });
  it("should accept an ApplicationStep object", async () => {
    expect(isApplicationStep(mockApplicationStep)).toEqual(true);
  });
  it("should reject an ApplicationStep missing any field", async () => {
    expect(isApplicationStep(mockApplicationStepsMissingFields)).toEqual(false);
  });
});
describe("isApplication()", () => {
  it.each([true, 1, undefined, null])("should reject non-objects", async (item) => {
    expect(isApplication(item)).toEqual(false);
  });
  it.each(mockApplicationStep.applications)("should accept an Application object", async (item) => {
    expect(isApplication(item)).toEqual(true);
  });
  it("should reject an Application missing any field", async () => {
    expect(isApplication(mockApplicationsMissingFields)).toEqual(false);
  });
});
describe("isEnvironment()", () => {
  it.each([true, 1, undefined, null])("should reject non-objects", async (item) => {
    expect(isEnvironment(item)).toEqual(false);
  });
  it.each(mockApplicationCloudCityEvacPlanner.environments)("should accept an Environment object", async (item) => {
    expect(isEnvironment(item)).toEqual(true);
  });
  it("should reject an Environment missing any field", async () => {
    expect(isEnvironment(mockEnvironmentsMissingFields)).toEqual(false);
  });
});
describe("isOperator()", () => {
  const missingOperatorFields = [
    {
      // display_name: "name",
      email: "yoda@iam.mil",
      access: "administrator",
    },
    {
      display_name: "name",
      // email: "yoda@iam.mil",
      access: "administrator",
    },
    {
      display_name: "name",
      email: "yoda@iam.mil",
      // access: "administrator",
    },
  ];

  it.each([true, 1, undefined, null])("should reject non-object", (item) => {
    expect(isOperator(item)).toEqual(false);
  });
  it.each(mockApplicationJabbasPalaceExpansionApp.operators)("should accept an Operator object", (item) => {
    expect(isOperator(item)).toBe(true);
  });
  it.each(missingOperatorFields)("should reject Operator with missing field", (item) => {
    expect(isOperator(item)).toBe(false);
  });
});
describe("isMilEmail()", () => {
  const goodMilEmails = [
    "good-email@testing.mil",
    "good.email_1234567890@testing.mil",
    "good_email_1234567890@testing_1234567-890.mil",
  ];
  const badMilEmails = [
    "bad.email_1234567890@testing.au",
    "bad-email!@#$%^&*()+=@testing.co",
    "bad_email_1234567890@testing!@#$%^&*(+=).io",
  ];

  it.each(goodMilEmails)("should be true for good emails", (email) => {
    expect(isMilEmail(email)).toEqual(true);
  });
  it.each(badMilEmails)("should be false for bad emails", (item) => {
    expect(isMilEmail(item)).toBe(false);
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
  it.each([
    "1970-01-01",
    "2021-10-12",
    "2000-02-29",
    "2032-12-31",
    "2019-10-02",
    "1969-07-20",
    "1977-05-25",
    "2006-03-14",
  ])("should accept valid dates", async (date) => {
    expect(isValidDate(date)).toEqual(true);
  });
  it.each([
    "",
    "not an ISO date",
    NaN.toString(),
    "7",
    "undefined",
    "null",
    "tomorrow",
    "yesterday",
    "today",
    "Friday",
    "0-14-7",
    "not-a-date",
    "2341-23-67",
  ])("should not accept non-date values", async (date) => {
    expect(isValidDate(date)).toEqual(false);
  });
  it.each(["2021-09-31", "2021-04-31", "2021-06-31", "2021-11-31"])(
    "reject the 31st of months with 30 days",
    async (date) => {
      expect(isValidDate(date)).toEqual(false);
    }
  );
  it.each(["2020-02-30", "2020-02-31", "2021-02-30", "2021-02-31", "2000-02-31", "3000-02-31"])(
    "should reject the 30th and 31st of February every year",
    async (date) => {
      expect(isValidDate(date)).toEqual(false);
    }
  );
  it.each(["1900-02-29", "2100-02-29", "2021-02-29", "2019-02-29", "3000-02-29"])(
    "should reject the 29th in non-leap-years",
    async (date) => {
      expect(isValidDate(date)).toEqual(false);
    }
  );
  it.each(["2020-02-29", "2000-02-29", "2024-02-29"])("should accept the 29th in leap years", async (date) => {
    expect(isValidDate(date)).toEqual(true);
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
  it.each(goodClinNumbers)("should accept a clin number with expected length and within accepted range", (num) => {
    expect(isClinNumber(num)).toEqual(true);
  });
  const badClinNumbers = ["", "0", "1", "02", "111", "0000", "10000", "99999"];
  it.each(badClinNumbers)("should reject a clin number with unexpected length or not within accepted range", (num) => {
    expect(isClinNumber(num)).toEqual(false);
  });
});

describe("isFundingAmount()", function () {
  const goodAmounts = ["1", "1.1", "1.50", "1.99", "250000"];
  it.each(goodAmounts)("should accept a funding amount that is valid", (num) => {
    expect(isFundingAmount(num)).toEqual(true);
  });
  const badAmounts = ["", "0", "-1", "not a number"];
  it.each(badAmounts)("should reject a funding amount that is invalid", (num) => {
    expect(isFundingAmount(num)).toEqual(false);
  });
  // TODO: What should be done with decimals greater than two digits?
  // Reject?  Accept and round?  Accept and truncate?
  // This formatter rounds the values to nearest cent:
  // Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  // The values below yield ["$1.99", "$1.99", "$2.00", "$2.00"];
  const questionableAmounts = ["1.991", "1.994", "1.995", "1.999"];
  it.each(questionableAmounts)("should accept a funding amount that is valid", (num) => {
    expect(isFundingAmount(num)).toEqual(true);
  });
});
