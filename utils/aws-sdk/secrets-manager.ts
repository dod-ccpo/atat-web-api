import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { logger } from "../logging";

export const secretsClient = new SecretsManager({ useFipsEndpoint: true, logger });
