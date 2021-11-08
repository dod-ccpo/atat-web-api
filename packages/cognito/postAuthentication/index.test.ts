import { handler } from "./index";
import { PostAuthenticationTriggerEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

interface TestEvent {
  lambdaEvent: PostAuthenticationTriggerEvent;
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
        newDeviceUsed: false,
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
      triggerSource: "PostAuthentication_Authentication",
    },
    groupNames,
  };
  return responseTemplate;
}

describe("Test console logging", function () {
  it("should console log the event", async () => {
    const consoleLogSpy = jest.spyOn(console, "log");
    const event = createBasicSampleEvent({ groupCount: 5, providerType: "FooProvider" });
    await handler(event.lambdaEvent);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
