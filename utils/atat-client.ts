import { AtatClient } from "../api/client";
import { GetSecretValueCommandInput } from "@aws-sdk/client-secrets-manager";
import { secretsClient } from "./aws-sdk/secrets-manager";
import { logger } from "./logging";
import { getToken } from "../idp/client";

export interface CspConfiguration {
  /**
   * The base URL at which the CSP implementation of the ATAT API can be reached.
   */
  uri: string;
  /**
   * The target Impact Level at which the CSP implementation is to be sent.
   */
  network: string[];
}

export async function getConfiguration(cspName: string): Promise<CspConfiguration | undefined> {
  const request: GetSecretValueCommandInput = { SecretId: process.env.CSP_CONFIG_SECRET_NAME };
  logger.info("Fetching CSP configuration", { request: { ...request } });
  const configString = (await secretsClient.getSecretValue(request)).SecretString!;
  const config = JSON.parse(configString);
  return config[cspName];
}

/**
 * Get an ATAT client using the default configuration within a HOTH Lambda function.
 *
 * This requires `CSP_CONFIG_SECRET_NAME`, `IDP_CLIENT_SECRET_NAME`, `IDP_CLIENT_ID`, and
 * `IDP_BASE_URL` to be set as environment variables.
 */
export async function makeClient(cspName: string): Promise<AtatClient> {
  const cspConfiguration = await getConfiguration(cspName);
  if (!cspConfiguration) {
    // After mock endpoint implementation or CSP integration happens revert to
    // throw error. This bypasses the error to return an ATAT client requires setup
    // of csps as secrets within AWS to provided information
    return new AtatClient("MOCK_TOKEN", {
      name: cspName,
      uri: `https://${cspName}.example.com`,
      network: "NETWORK_1",
    } as any);
    // TODO: revert once external endpoint available
    // throw new Error(`No configuration is available for ${cspName}`);
  }
  const token = await getToken();
  return new AtatClient(token.access_token, cspConfiguration, logger);
}
