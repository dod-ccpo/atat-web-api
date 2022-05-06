import { Context } from "aws-lambda";
import { GetSecretValueCommandInput } from "@aws-sdk/client-secrets-manager";
import axios from "axios";
import { Logger } from "@aws-lambda-powertools/logger";
import { secretsClient } from "../utils/aws-sdk/secrets-manager";

const logger = new Logger({ serviceName: "TestIdp" });

const IDP_CLIENT_ID = process.env.IDP_CLIENT_ID!;
const IDP_CLIENT_SECRET_NAME = process.env.IDP_CLIENT_SECRET_NAME!;
const IDP_DOMAIN = process.env.IDP_DOMAIN!;
const IDP_CLIENT_SECRET = fetchClientSecret(IDP_CLIENT_SECRET_NAME);

/**
 * Very basic encoding of the Cognito TOKEN endpoint response objects.
 */
interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: "Bearer";
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
 * Decode a JWT without performing any verification of the token.
 *
 * @param payload The raw reponse from the TOKEN endpoint
 */
function unsafelyDecodeJwt(payload: string): { [key: string]: any } {
  const base64Data = payload.split(".")[1];
  const decoded = Buffer.from(base64Data, "base64");
  return JSON.parse(decoded.toString());
}

/**
 * Perform the request to get the token from the TOKEN endpoint.
 *
 * Throws an error if the response is not a 200
 *
 * @param clientId The OAuth client ID
 * @param clientSecret The secret to use to authenticate to the server
 * @param baseUrl The base URL of the authentication server
 * @param timeout The timeout to use when making the token request
 * @param scopes The scopes to request in the token
 */
async function getToken(
  clientId: string,
  clientSecret: string,
  baseUrl: string,
  timeout?: number,
  scopes?: string[]
): Promise<TokenResponse> {
  logger.info("Fetching a token from the TOKEN endpoint", { clientId });
  const response = await axios.post(`${baseUrl}/oauth2/token`, buildTokenRequest(clientId, scopes), {
    timeout,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: clientId,
      password: clientSecret,
    },
  });
  if (response.status !== 200) {
    logger.info("Received a non-success response", { response: response.data });
    throw new Error(response.data.error);
  }
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
    const response = await getToken(
      IDP_CLIENT_ID,
      IDP_CLIENT_SECRET,
      `https://${IDP_DOMAIN}`,
      context.getRemainingTimeInMillis() - 500,
      ["atat/read-cost"]
    );
    const body = { type: response.token_type, expires_in: response.expires_in };
    logger.info("Received token from client credentials", {
      response: { body },
    });
    logger.info("Decoded the received token", { token: unsafelyDecodeJwt(response.access_token) });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error("The request to get an OAUTH 2.0 token failed", error as Error);
    } else {
      logger.error("An unexpected error occurred when handling the token", error as Error);
    }
  }
}
