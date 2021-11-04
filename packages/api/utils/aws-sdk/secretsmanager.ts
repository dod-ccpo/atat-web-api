import { SecretsManager } from "@aws-sdk/client-secrets-manager";

// Create a Secrets Manager service object.
export const smClient = new SecretsManager({});
