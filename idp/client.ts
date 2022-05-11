import { Context } from "aws-lambda";
import { GetSecretValueCommandInput } from "@aws-sdk/client-secrets-manager";
import axios from "axios";
import { Logger } from "@aws-lambda-powertools/logger";
import { secretsClient } from "../utils/aws-sdk/secrets-manager";

const logger = new Logger({ serviceName: "IdpClient" });

const IDP_CLIENT_ID = process.env.IDP_CLIENT_ID!;
const IDP_CLIENT_SECRET_NAME = process.env.IDP_CLIENT_SECRET_NAME!;
const IDP_BASE_URL = process.env.IDP_BASE_URL!;
const IDP_CLIENT_SECRET = fetchClientSecret(IDP_CLIENT_SECRET_NAME);

/**
 * A very basic encoding of a TOKEN endpoint response object.
 *
 * This does not include all the possible responses for all IdPs but includes some really
 * common values.
 */
export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: "Bearer";
}

/**
 * Get the actual client secret value from AWS Systems Manager
 *
 * @param secretId the name/ARN of the Secrets Manager secret
 */
async function fetchClientSecret(secretId: string): Promise<string> {
  const request: GetSecretValueCommandInput = { SecretId: secretId };
  logger.info("Retriving client secret from Secrets Manager", { request: { ...request } });
  return (await secretsClient.getSecretValue(request)).SecretString!;
}

/**
 * Basic configuration parameters for interacting with an identity provider.
 */
export interface ClientConfiguration {
  /**
   * The client_id value to use in requests
   */
  readonly clientId: string;
  /**
   * The client secret to use when making requests to the IdP
   */
  readonly clientSecret: string;
  /**
   * The base HTTPS url for the IdP.
   *
   * This should likely start with `https://` and not include a path segment, `oauth2/token`
   * and other necessary paths will be appended to the provided URL.
   */
  readonly idpBaseUrl: string;
}

/**
 * Fetches the configuration for this IdP client from the application's environment (and
 * from AWS Secrets Manager where necessary).
 * The Client ID is fetched from `IDP_CLIENT_ID`, the IdP base URL is fetched from
 * `IDP_BASE_URL`, and the Secret to lookup in Secrets Manager is fetched from
 * `IDP_CLIENT_SECRET_NAME`.
 */
export async function getConfigurationFromEnvironment(): Promise<ClientConfiguration> {
  return {
    clientId: process.env.IDP_CLIENT_ID!,
    clientSecret: await fetchClientSecret(process.env.IDP_CLIENT_SECRET_NAME!),
    idpBaseUrl: process.env.IDP_BASE_URL!,
  };
}

/**
 * Build a client_credentials flow request body
 *
 * This does not support requesting any scopes.
 *
 * @param clientId The OAuth Client ID
 * @param scopes A list of scopes to request
 */
function buildTokenRequest(clientId: string, scopes?: string[]): URLSearchParams {
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  if (scopes?.length) {
    form.set("scope", scopes.join(" "));
  }
  return form;
}

/**
 * Decode a JWT without performing any verification of the token.
 *
 * This ensures that the output strips the signature component so that it can't
 * be captured from the logs and re-used.
 *
 * @param payload The raw reponse from the TOKEN endpoint
 */
function decodeJwtForLoggingWithoutVerifying(payload: string): { [key: string]: any } {
  const base64Data = payload.split(".")[1];
  const decoded = Buffer.from(base64Data, "base64");
  return JSON.parse(decoded.toString());
}

/**
 * Configuration for fetching a token from the IdP
 */
export interface GetTokenInput {
  /**
   * The function to use to determine the configuration for the IdP.
   * @default fetch the information from the environment
   */
  clientConfigurationProvider?: () => Promise<ClientConfiguration>;
  /**
   * The timeout to use for the HTTP request to the IdP
   * @default do not use a timeout
   */
  timeout?: number;
  /**
   * The scopes to request during the client_credentials flow.
   * @default the IdP default behavior when no scopes are provided (usually equivalent to
   *  requesting all scopes).
   */
  scopes?: string[];
}

/**
 * Perform the request to get the token from the TOKEN endpoint.
 *
 * Throws an error if the response is not a 200.
 */
export async function getToken(input?: GetTokenInput): Promise<TokenResponse> {
  const { clientId, clientSecret, idpBaseUrl } = await (
    input?.clientConfigurationProvider ?? getConfigurationFromEnvironment
  )();
  logger.info("Fetching a token from the TOKEN endpoint", { clientId });
  const response = await axios.post(`${idpBaseUrl}/oauth2/token`, buildTokenRequest(clientId, input?.scopes), {
    timeout: input?.timeout,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: clientId,
      password: clientSecret,
    },
    // Don't throw an error on non-2xx/3xx status code (let us handle it)
    validateStatus() {
      return true;
    },
  });
  if (response.status !== 200) {
    logger.info("Received a non-success response", { response: response.data });
    throw new Error(response.data.error);
  }
  logger.info("Received a token", { token: decodeJwtForLoggingWithoutVerifying(response.data.access_token) });
  return response.data;
}

/**
 * This creates a function to get and log an OAuth 2.0 token using a client_credentials flow.
 *
 * This does not return any response object and totally disregards the event body. In general,
 * this function is intended to be invoked purely via the AWS CLI or the AWS Console.
 *
 * It _does not_ log the actual token received; however, it does log metadata about the token,
 * including the `expires_in` and `token_type` attributes.
 *
 * This function really ought to be replaced in the near future. Probably in AT-7337, either
 * replaced by some library that can handle this or converted into such a library.
 */
export async function handler(_event: Record<string, never>, context: Context): Promise<void> {
  logger.addContext(context);

  try {
<<<<<<< HEAD
    const response = await getToken(
      IDP_CLIENT_ID,
      await IDP_CLIENT_SECRET,
      IDP_BASE_URL,
      context.getRemainingTimeInMillis() - 500,
      ["atat/read-cost"]
    );
=======
    const response = await getToken({
      timeout: context.getRemainingTimeInMillis() - 500,
      scopes: ["atat/read-cost"],
    });
>>>>>>> 270bea0 (Refactor IdP Client into a library)
    const body = { type: response.token_type, expires_in: response.expires_in };
    logger.info("Received token from client credentials", {
      response: { body },
    });
    logger.info("Decoded the received token", { token: decodeJwtForLoggingWithoutVerifying(response.access_token) });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("The request to get an OAUTH 2.0 token failed", error as Error);
    } else {
      logger.error("An unexpected error occurred when handling the token", error as Error);
    }
  }
}
