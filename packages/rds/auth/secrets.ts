import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { DatabaseCredentials } from "./creds";

const smClient = new SecretsManager({});

export async function getDatabaseCredentials(secretName: string): Promise<DatabaseCredentials> {
  const ssmResult = await smClient.getSecretValue({ SecretId: secretName });
  const credentialString = ssmResult.SecretString;
  if (!credentialString) {
    throw new Error(`The provided secret "${secretName} does not have a string value`);
  }
  const credentials = JSON.parse(credentialString);
  return {
    username: credentials.username,
    password: credentials.password,
  };
}
