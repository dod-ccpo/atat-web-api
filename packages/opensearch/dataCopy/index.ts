import * as util from "util";
import * as stream from "stream";
import * as opensearch from "@opensearch-project/opensearch";
import * as process from "process";
import * as awsCredentials from "@aws-sdk/credential-providers";
import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";

import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Sha256 } from "@aws-crypto/sha256-js";

function createSigner(): SignatureV4 {
  return new SignatureV4({
    credentials: awsCredentials.fromEnv(),
    region: process.env.AWS_REGION!,
    service: "es",
    sha256: Sha256,
  });
}

/**
 * Converts the Readable/Stream body of an S3 GetObjectCommandOutput object
 * to a base64-encoded string.
 *
 * Because data from S3 may be binary data, we cannot assume that it will be
 * correct or safe to pass it as a UTF-8 or ASCII string (because images don't
 * encode that way very well, especially though multiple web APIs designed for
 * JSON). This converts it to a base64 string.
 *
 * @param body The Body of the S3 GetObjectCommandOutput
 * @returns The base64-encoded body
 */
export async function responseBodyToString(body: stream.Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    body.on("data", (chunk) => chunks.push(chunk));
    body.on("error", reject);
    body.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

function requestForRecord(record: DynamoDBRecord): HttpRequest {
  // Assertion is safe because OPENSEARCH_DOMAIN will always be set
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const domain = process.env.OPENSEARCH_DOMAIN!;
  const id = record.dynamodb?.Keys?.id.S;
  const path = `portfolio-drafts/_doc/${id}`;
  switch (record.eventName) {
    case "REMOVE":
      return new HttpRequest({
        headers: { host: domain },
        method: "DELETE",
        hostname: domain,
        path,
      });
    default:
      return new HttpRequest({
        body: JSON.stringify(record.dynamodb?.NewImage),
        headers: {
          "Content-Type": "application/json",
          host: domain,
        },
        hostname: domain,
        method: "PUT",
        path,
      });
  }
}

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const signer = createSigner();
  const client = new NodeHttpHandler();

  // Logging is intentionally overly verbose for demonstration purposes during
  // the proof-of-concept phase.
  // TODO: Reduce logging

  console.log(JSON.stringify(event));

  for (const record of event.Records) {
    console.log("Processing: " + JSON.stringify(record));
    const httpRequest = requestForRecord(record);
    console.log("HTTP Request: " + JSON.stringify(httpRequest));
    const signedRequest = await signer.sign(httpRequest);
    console.log("Signed Request: " + JSON.stringify(signedRequest));
    // @ts-expect-error I dunno -- TODO I guess? 🤷🏻 it's mad about a missing `clone()` method
    const { response } = await client.handle(signedRequest);
    console.log(response.statusCode + " " + response.body.statusMessage);
    console.log(util.inspect(response));
    console.log(await responseBodyToString(response.body));
  }
}
