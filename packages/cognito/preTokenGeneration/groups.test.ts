import { PreTokenGenerationTriggerEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { processSamlGroupData, translateGroups } from "./groups";

interface TestEvent {
  lambdaEvent: PreTokenGenerationTriggerEvent;
  groupNames: string[];
}

interface TestEventProps {
  groupCount: number;
  providerType: string;
  groupAttribute?: string;
  originalGroups?: string[];
}

function generateGroups(length: number): string[] {
  return Array.from({ length }, () => uuidv4());
}

function createBasicSampleEvent(props: TestEventProps): TestEvent {
  if (!props.groupAttribute) {
    props.groupAttribute = "custom:groups";
  }
  if (!("originalGroups" in props)) {
    props.originalGroups = [];
  }
  const groupNames = generateGroups(props.groupCount);
  const groupString = props.providerType === "SAML" ? '["' + groupNames.join(",") + '"]' : JSON.stringify(groupNames);
  const responseTemplate: TestEvent = {
    lambdaEvent: {
      request: {
        userAttributes: {
          identities: JSON.stringify([
            {
              providerType: props.providerType,
            },
          ]),
          [props.groupAttribute]: groupString,
        },
        groupConfiguration: {
          groupsToOverride: props.originalGroups,
        },
      },
      response: { claimsOverrideDetails: {} },
      // Required attributes we don't care about
      version: "",
      region: "",
      userPoolId: "",
      userName: "",
      callerContext: {
        awsSdkVersion: "",
        clientId: "",
      },
      triggerSource: "TokenGeneration_HostedAuth",
    },
    groupNames,
  };
  return responseTemplate;
}

describe("Testing handling of SAML groups", () => {
  it("should return an empty list for an empty string", async () => {
    expect(processSamlGroupData([""])).toEqual([]);
  });
  it("should return an empty list for an empty list", async () => {
    expect(processSamlGroupData([])).toEqual([]);
  });
  it.each([
    { groups: ["foo"], expected: ["foo"] },
    { groups: ["admins"], expected: ["admins"] },
    { groups: ["users"], expected: ["users"] },
  ])("should return the same as input for one group", async ({ groups }) => {
    expect(processSamlGroupData(groups)).toEqual(groups);
  });
  it.each([
    { groups: ["foo,bar,baz"], expected: ["foo", "bar", "baz"] },
    { groups: ["administrators,users"], expected: ["administrators", "users"] },
    {
      groups: [
        "42d573b7-617f-4ebe-8f85-baa63813a6f8,60dd0e3d-555c-4b2b-a843-da5cb5a7cd77,7ca1ce7a-7e32-42de-b564-522e61360f02",
      ],
      expected: [
        "42d573b7-617f-4ebe-8f85-baa63813a6f8",
        "60dd0e3d-555c-4b2b-a843-da5cb5a7cd77",
        "7ca1ce7a-7e32-42de-b564-522e61360f02",
      ],
    },
  ])("should convert a comma-separated list to a list", async ({ groups, expected }) => {
    expect(processSamlGroupData(groups)).toEqual(expected);
  });
  it.each([
    { groups: ["foo, bar , baz"], expected: ["foo", "bar", "baz"] },
    { groups: ["     foo  "], expected: ["foo"] },
  ])("should strip whitespace from all group ids", async ({ groups, expected }) => {
    expect(processSamlGroupData(groups)).toEqual(expected);
  });
});

describe("Testing the handling of mock events", () => {
  describe.each(["SAML", "OIDC"])("For supported provider %s", (providerType) => {
    it("should properly parse IdP groups", async () => {
      const event = createBasicSampleEvent({ groupCount: 5, providerType });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(event.groupNames);
    });
    it("should be able to handle a single group", async () => {
      const event = createBasicSampleEvent({ groupCount: 1, providerType });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(event.groupNames);
    });
    it("should include all existing groups in the output", async () => {
      const originalGroups = generateGroups(5);
      const event = createBasicSampleEvent({ groupCount: 5, providerType, originalGroups });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual([...originalGroups, ...event.groupNames]);
    });
    it("should not fail if there are no groups", async () => {
      const event = createBasicSampleEvent({ groupCount: 0, providerType });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual([]);
    });
    it("should contain all existing groups if there are no custom", async () => {
      const originalGroups = generateGroups(5);
      const event = createBasicSampleEvent({ groupCount: 0, providerType, originalGroups });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(originalGroups);
    });
    it("should return given groups if original groups are undefined", async () => {
      const originalGroups = undefined;
      const event = createBasicSampleEvent({ groupCount: 5, providerType, originalGroups });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(event.groupNames);
    });
    it("should return an empty list of groups if the event doesn't have them", async () => {
      const original = console.error;
      console.error = jest.fn();
      const event = createBasicSampleEvent({ groupCount: 0, groupAttribute: "notGroups", providerType });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
      console.error = original;
    });
  });
  describe("For unsupported provider", () => {
    beforeEach(() => {
      jest.spyOn(global.console, "warn").mockImplementation(() => jest.fn());
    });
    it("should not result in an error", async () => {
      const event = createBasicSampleEvent({ groupCount: 5, providerType: "FooProvider" });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual([]);
    });
    it("should return all original groups", async () => {
      const originalGroups = generateGroups(5);
      const event = createBasicSampleEvent({ groupCount: 0, providerType: "FooProvider", originalGroups });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(originalGroups);
      expect(console.warn).toHaveBeenCalled();
    });
    it("should only include the original groups", async () => {
      const originalGroups = generateGroups(5);
      const event = createBasicSampleEvent({ groupCount: 5, providerType: "FooProvider", originalGroups });
      const result = translateGroups(event.lambdaEvent);
      expect(result).toEqual(originalGroups);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
