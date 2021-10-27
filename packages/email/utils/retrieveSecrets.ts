import { SECRETS_NOT_RETRIEVED } from "./statusCodesAndErrors";
import { smClient } from "./secretsManager";

export interface SmtpConfiguration {
  hostname: string;
  port: number;
  username: string;
  password: string;
}

export async function retrieveSecrets(id: string): Promise<SmtpConfiguration> {
  try {
    const response = await smClient.getSecretValue({ SecretId: id });
    return JSON.parse(response.SecretString ?? "");
  } catch (error) {
    if (error.name === "CredentialsProviderError") {
      console.log(SECRETS_NOT_RETRIEVED);
      throw error;
    }
    // unknown 5xx errors
    throw error;
  }
}
