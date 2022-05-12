import axios from "axios";
import { GetSecretValueCommand, SecretsManager } from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";
import * as idpClient from "./client";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const TEST_CLIENT_ID = "CLIENT_ID";
const TEST_CLIENT_SECRET_NAME = "CLIENT_SECRET_NAME";
const TEST_CLIENT_FAKE_SECET = "NOT_A_SECRET";
const TEST_IDP_BASE_URL = "https://mockidp.example.com/atat";

/**
 * A sample credential provider to meet the API; makes it easier to ensure that
 * we can test other components of the IdP Client configuration without having
 * to repetively muck with the environment.
 */
async function mockCredentialProvider(): Promise<idpClient.ClientConfiguration> {
  return {
    clientId: TEST_CLIENT_ID,
    clientSecret: TEST_CLIENT_FAKE_SECET,
    idpBaseUrl: TEST_IDP_BASE_URL,
  };
}

function fakeTokenResponse(): idpClient.TokenResponse {
  const token = {
    dont: "use",
    this: "token",
  };
  return {
    access_token:
      Buffer.from("foo").toString("base64") +
      "." +
      Buffer.from(JSON.stringify(token)).toString("base64") +
      "." +
      Buffer.from("foo").toString("base64"),
    expires_in: 3600,
    token_type: "Bearer",
  };
}

describe("Environment Configuration Provider", () => {
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
    process.env.IDP_CLIENT_ID = TEST_CLIENT_ID;
    process.env.IDP_CLIENT_SECRET_NAME = TEST_CLIENT_SECRET_NAME;
    process.env.IDP_BASE_URL = TEST_IDP_BASE_URL;
    const secretsMock = mockClient(SecretsManager)
      .on(GetSecretValueCommand)
      .resolves({ SecretString: TEST_CLIENT_FAKE_SECET });

    // WHEN
    const config = idpClient.getConfigurationFromEnvironment();

    // THEN
    // Ensure that gratuitous calls are not made and that the correct secret is
    // retrieved. Retrieving the secret from the correct environment variable is
    // part of the API of this function
    expect(secretsMock.send.calledOnce).toBeTruthy();
    expect(secretsMock.call(0).firstArg.input).toEqual({ SecretId: TEST_CLIENT_SECRET_NAME });
  });

  it("should return a properly-structed object", async () => {
    // GIVEN
    process.env.IDP_CLIENT_ID = TEST_CLIENT_ID;
    process.env.IDP_CLIENT_SECRET_NAME = TEST_CLIENT_SECRET_NAME;
    process.env.IDP_BASE_URL = TEST_IDP_BASE_URL;
    const secretsMock = mockClient(SecretsManager)
      .on(GetSecretValueCommand)
      .resolves({ SecretString: TEST_CLIENT_FAKE_SECET });

    // WHEN
    const config = idpClient.getConfigurationFromEnvironment();

    // THEN
    expect(await config).toEqual({
      clientId: "CLIENT_ID",
      clientSecret: "NOT_A_SECRET",
      idpBaseUrl: "https://mockidp.example.com/atat",
    });
  });
});

describe("Token request", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should return the IdP response", async () => {
    // GIVEN
    const expectedResponse = fakeTokenResponse();
    mockedAxios.post.mockResolvedValueOnce({
      data: expectedResponse,
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      config: {},
    });

    // WHEN
    const response = await idpClient.getToken({ clientConfigurationProvider: mockCredentialProvider });

    // THEN
    expect(response).toStrictEqual(expectedResponse);
  });

  it("should throw an error on failure", async () => {
    // GIVEN
    const expectedResponse = { error: "invalid_request" };
    mockedAxios.post.mockResolvedValueOnce({
      data: expectedResponse,
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      config: {},
    });

    // WHEN
    const response = idpClient.getToken({ clientConfigurationProvider: mockCredentialProvider });

    // THEN
    expect(response).rejects.toThrow(expectedResponse.error);
  });

  it("should properly set request parameters", async () => {
    // GIVEN
    const expectedResponse = fakeTokenResponse();
    mockedAxios.post.mockResolvedValueOnce({
      data: expectedResponse,
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json" },
      config: {},
    });

    // WHEN
    const response = await idpClient.getToken({
      clientConfigurationProvider: mockCredentialProvider,
      scopes: ["foo", "bar"],
    });

    // THEN
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toBeCalledWith(
      `${TEST_IDP_BASE_URL}/oauth2/token`,
      new URLSearchParams({ grant_type: "client_credentials", client_id: TEST_CLIENT_ID, scope: "foo bar" }),
      expect.objectContaining({
        auth: {
          username: TEST_CLIENT_ID,
          password: TEST_CLIENT_FAKE_SECET,
        },
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      })
    );
    expect(response).toStrictEqual(expectedResponse);
  });
});
