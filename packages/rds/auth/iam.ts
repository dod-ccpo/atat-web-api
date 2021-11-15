import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Hash } from "@aws-sdk/hash-node";
import { formatUrl } from "@aws-sdk/util-format-url";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Credentials } from "@aws-sdk/types";

const DEFAULT_TOKEN_EXPIRATION = 15 * 60; // 15 minutes

export interface GetAuthTokenParams {
  /**
   * The hostname of the RDS database instance/cluster.
   */
  hostname: string;
  /**
   * The port on which to connect to the database, for example 5432 or 3306.
   */
  port: number;
  /**
   * The database user to authenticate as.
   */
  username: string;
  /**
   * The region the database is in, defaults to the current region.
   */
  region?: string;
  /**
   * The IAM principal's credentials, defaults to the default credentials in the
   * current execution environment.
   */
  credentials?: Credentials;
  /**
   * The length of time, in seconds, that the token is valid for. Default to 15 minutes.
   */
  expiration?: number;
}

/**
 * Get a token to authenticate to RDS using an IAM principal.
 *
 * This is not currently provided directly via the AWS SDK for JS v3, though, nearly all
 * other SDKs currently implement it. This will be deprecated when the implementation is
 * available in the SDK.
 */
export async function getAuthToken(options: GetAuthTokenParams): Promise<string> {
  // In any Lambda execution environment, the AWS_REGION variable will be set.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const region = options.region ?? process.env.AWS_REGION!;
  const credentials = options.credentials ?? defaultProvider();
  const expiration = options.expiration ?? DEFAULT_TOKEN_EXPIRATION;
  const protocol = "https";

  const signer = new SignatureV4({
    service: "rds-db",
    region: region,
    credentials: credentials,
    sha256: Hash.bind(null, "sha256"),
  });

  const request = new HttpRequest({
    method: "GET",
    protocol: protocol,
    hostname: options.hostname,
    port: options.port,
    query: {
      Action: "connect",
      DBUser: options.username,
    },
    headers: {
      host: `${options.hostname}:${options.port}`,
    },
  });

  const presigned = await signer.presign(request, { expiresIn: expiration });
  return formatUrl(presigned).replace(`${protocol}://`, "");
}
