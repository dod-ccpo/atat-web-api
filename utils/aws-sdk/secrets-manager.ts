import { SecretsManager } from "@aws-sdk/client-secrets-manager";

export const secretsClient = new SecretsManager({ useFipsEndpoint: true });
