import { SecretsManager } from "@aws-sdk/client-secrets-manager";
const smClient = new SecretsManager({});

export type DatabaseCredentials = {
  username: string;
  password: string;
};

export async function getAuthPassword(secretName: string): Promise<DatabaseCredentials> {
  const ssmResult = await smClient.getSecretValue({ SecretId: secretName });
  const credentialString = ssmResult.SecretString;
  const credentials = JSON.parse(credentialString!);
  return {
    username: credentials.user_name,
    password: credentials.password,
  };
}
