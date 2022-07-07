import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { logger } from "../logging";

// For this client, we do not use the `useFipsEndpoint` parameter. In the end, this will use
// our private endpoint, which is FIPS-compliant; however, the DNS query that results will be
// for `secretsmanager-fips.<region>.amazonaws.com. The private endpoint will only "register"
// as `secretsmanager.<region>.amazonaws.com. This results in failed queries to the endpoint
// with our networking configuration.
export const secretsClient = new SecretsManager({ logger });
