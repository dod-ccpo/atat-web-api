import { ScheduledEvent, Context } from "aws-lambda";
import axios from "axios";
import { Logger } from "@aws-lambda-powertools/logger";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
const logger = new Logger({ serviceName: "TestIdp" });

const secrets = new SecretsManager({ useFipsEndpoint: true });

const IDP_CLIENT_ID = process.env.IDP_CLIENT_ID!;
const IDP_CLIENT_SECRET_NAME = process.env.IDP_CLIENT_SECRET_NAME!;
const IDP_DOMAIN = process.env.IDP_DOMAIN!;

// We use the ScheduledEvent here but in actuality, we don't care about the type
// of the event. This function is only ever going to invoked via the CLI or console
// to prove out the credential flow.
export async function handler(event: ScheduledEvent, context: Context): Promise<void> {
  logger.addContext(context);
  logger.info("Retriving client secret from Secrets Manager", { secretId: IDP_CLIENT_SECRET_NAME });
  const clientSecret = (await secrets.getSecretValue({ SecretId: IDP_CLIENT_SECRET_NAME })).SecretString!;
  logger.info("Retrieving a token from IdP using Client ID", { clientId: IDP_CLIENT_ID });
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", IDP_CLIENT_ID);
  let response;
  try {
    response = await axios.post(`https://${IDP_DOMAIN}/oauth2/token`, form, {
      // Allow the request to take its time but give some time for cleanup
      timeout: context.getRemainingTimeInMillis() - 500,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: IDP_CLIENT_ID,
        password: clientSecret,
      },
    });
  } catch (error) {
    logger.error("The request to get an OAUTH 2.0 token failed", error as Error);
    return;
  }
  if (response.status !== 200) {
    logger.error("Error getting credentials", { response: response.data });
    return;
  }
  const body = { type: response.data.token_type, expires_in: response.data.expires_in };
  logger.info("Received token from client credentials", {
    response: { body },
  });
}
