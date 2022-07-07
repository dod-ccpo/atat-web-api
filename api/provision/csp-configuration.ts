import { GetSecretValueCommandInput } from "@aws-sdk/client-secrets-manager";
import { secretsClient } from "../../utils/aws-sdk/secrets-manager";
import { logger } from "../../utils/logging";

export interface CspConfiguration {
  /**
   * The base URL at which the CSP implementation of the ATAT API can be reached.
   */
  uri: string;
}

export async function getConfiguration(cspName: string): Promise<CspConfiguration | undefined> {
  const request: GetSecretValueCommandInput = { SecretId: process.env.CSP_CONFIG_SECRET_NAME };
  logger.info("Fetching CSP configuration", { request: { ...request } });
  const configString = (await secretsClient.getSecretValue(request)).SecretString!;
  const config = JSON.parse(configString);
  logger.info("Retrieved Config");
  return config[cspName];
}
