import { AtatClient } from "../api/client";
import { logger } from "./logging";
import { getToken } from "../idp/client";
import { getConfiguration } from "../api/provision/csp-configuration";

/**
 * Get an ATAT client using the default configuration within a HOTH Lambda function.
 *
 * This requires `CSP_CONFIG_SECRET_NAME`, `IDP_CLIENT_SECRET_NAME`, `IDP_CLIENT_ID`, and
 * `IDP_BASE_URL` to be set as environment variables.
 */
export async function makeClient(cspName: string): Promise<AtatClient> {
  const cspConfiguration = await getConfiguration(cspName);
  // TODO: refactor this to no longer be mock-aware and then revisit any necessary tests
  if (!cspConfiguration) {
    // After mock endpoint implementation or CSP integration happens revert to
    // throw error. This bypasses the error to return an ATAT client requires setup
    // of csps as secrets within AWS to provided information
    return new AtatClient("MOCK_TOKEN", `https://${cspName}.example.com`);
    // TODO: revert once external endpoint available
    // throw new Error(`No configuration is available for ${cspName}`);
  }
  const token = await getToken();
  return new AtatClient(token.access_token, cspConfiguration.uri, logger);
}
