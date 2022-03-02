import * as utils from "../lib/util";

const testEnvironmentIds = [
  // Jira ticket ID-looking strings should be valid regardless of how they
  // get entered
  {
    inputs: ["AT-0001", "AT0001", "at0001", "aT0001", "At0001", "AT_0_0_0_1"],
    expectedName: "At0001",
    expectedId: "at0001",
  },
  // And "special" environment names should work the same as sandbox environments
  {
    inputs: ["Dev", "Dev!", "dev", "DEV", "dEv", "_dev_"],
    expectedName: "Dev",
    expectedId: "dev",
  },
  {
    inputs: ["Staging", "Staging!", "staging", "STAGING", "sTaGiNg", "_staging_"],
    expectedName: "Staging",
    expectedId: "staging",
  },
  {
    inputs: ["Prod", "Prod!", "prod", "PROD", "PrOd", "_prod_"],
    expectedName: "Prod",
    expectedId: "prod",
  },
  // Numbered "special" environment names should be treated like any other
  // string
  {
    inputs: ["Dev1", "dev1", "DEV1", "dEv1", "_dev1_", "Dev1!"],
    expectedName: "Dev1",
    expectedId: "dev1",
  },
  // Totally special or empty names should not break the function
  {
    inputs: ["", "&*(^&%^&$^%%*&", "_-__--_"],
    expectedName: "",
    expectedId: "",
  },
  // Even multi-word names get only one capital letter
  {
    inputs: ["LongEnvironmentName", "longenvironmentname", "lOnGeNvIrOnMeNtNaMe"],
    expectedName: "Longenvironmentname",
    expectedId: "longenvironmentname",
  },
  // Very short names should still work too
  {
    inputs: ["A", "a", "_A_", "_a_"],
    expectedName: "A",
    expectedId: "a",
  },
];

describe("Validate environment normalization", () => {
  it.each(["AT-1234", "&!@#!@", "", "at1234"])("should not contain special characters", async (testStr) => {
    expect(utils.normalizeEnvironmentName(testStr)).not.toMatch(/[\W_-]+/g);
  });

  it.each(testEnvironmentIds)("should return a normalized name for ticket ID", async ({ inputs, expectedName }) => {
    inputs.forEach((item) => expect(utils.normalizeEnvironmentName(item)).toEqual(expectedName));
  });

  it.each(testEnvironmentIds)("should return a normalized ID for ticket IDs", async ({ inputs, expectedId }) => {
    inputs.forEach((item) => expect(utils.lowerCaseEnvironmentId(item)).toEqual(expectedId));
  });
});

describe("Validate string type guards", () => {
  it.each([1, {}, [], null, undefined, false, true])("should reject non-strings", async (item) => {
    expect(utils.isString(item)).toEqual(false);
  });
  it("should reject the empty string", async () => {
    expect(utils.isString("")).toEqual(false);
  });
  it.each(["a", "longstring", "1312987A*&(^&*AHL"])("should accept strings", async (item) => {
    expect(utils.isString(item)).toEqual(true);
  });
});

describe("Validate temporary environment", () => {
  it.each(["dev", "sandbox", "staging", "prod", "development", "production"])(
    "should return false for real-looking envs",
    async (env) => {
      expect(utils.isPossibleTemporaryEnvironment(env)).toBe(false);
    }
  );
  it.each(["at1234", "usertestenv", "username20211108"])("should return true for generic names", async (env) => {
    expect(utils.isPossibleTemporaryEnvironment(env)).toBe(true);
  });
});
