import * as cspConfig from "./csp-configuration";
import { GetSecretValueCommand, SecretsManager } from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

const fakeCspConfig = {
  CSP_A: {
    uri: "https://cspa.example.com/cspa/atat",
  },
  CSP_B: {
    uri: "https://cspb.example.com/cspb/atat",
  },
  CSP_C: {
    uri: "https://cspc.example.com/cspc/atat",
  },
};

describe("Test fetch configuraton", () => {
  const env = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("should fetch from AWS Secrets Manager", async () => {
    // GIVEN
    process.env.CSP_CONFIG_SECRET_NAME = "test/config";
    const secretsMock = mockClient(SecretsManager)
      .on(GetSecretValueCommand)
      .resolves({ SecretString: JSON.stringify(fakeCspConfig) });

    // WHEN
    const config = cspConfig.getConfiguration("CSP_A");

    // THEN
    expect(secretsMock.send.calledOnce).toBeTruthy();
    expect(secretsMock.call(0).firstArg.input).toEqual({ SecretId: "test/config" });
  });

  it("should return the config for a single CSP", async () => {
    // GIVEN
    process.env.CSP_CONFIG_SECRET_NAME = "test/config";
    const secretsMock = mockClient(SecretsManager)
      .on(GetSecretValueCommand)
      .resolves({ SecretString: JSON.stringify(fakeCspConfig) });

    // WHEN
    const config = await cspConfig.getConfiguration("CSP_A");

    // THEN
    expect(config).toBeTruthy();
    expect(config?.uri).toStrictEqual(fakeCspConfig.CSP_A.uri);
  });

  it("should return undefined when the CSP does not exist", async () => {
    // GIVEN
    process.env.CSP_CONFIG_SECRET_NAME = "test/config";
    const secretsMock = mockClient(SecretsManager)
      .on(GetSecretValueCommand)
      .resolves({ SecretString: JSON.stringify(fakeCspConfig) });

    // WHEN
    const config = await cspConfig.getConfiguration("CSP_DNE");

    // THEN
    expect(config).toBeUndefined();
  });
});
