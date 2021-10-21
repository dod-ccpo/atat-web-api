import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { sqsClient } from "../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { DATABASE_ERROR, REQUEST_BODY_INVALID } from "../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../utils/response";
import middy from "@middy/core";
import { isBodyPresent } from "../utils/validation";
import xssSanitizer from "../portfolioDrafts/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import validator from "@middy/validator";

const QUEUE_URL = process.env.ATAT_QUEUE_URL ?? "";

export async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("EVENT", event.body);

  try {
    const response = await sqsClient.send(
      new SendMessageCommand({ MessageBody: JSON.stringify(event.body), QueueUrl: QUEUE_URL })
    );
    return new ApiSuccessResponse(response.$metadata, SuccessStatusCode.ACCEPTED);
  } catch (error) {
    console.log("Database error: " + error);
    return DATABASE_ERROR;
  }
}

export const schema = {
  required: ["emails", "emailType"],
  type: "object",
  properties: {
    emails: {
      type: "array",
      items: {
        type: "string",
        format: "email",
      },
    },
    emailType: {
      type: "string",
    },
  },
  additionalProperties: false,
  description: "Emails",
};

const schemaWrapper = {
  type: "object",
  required: ["body"],
  properties: {
    body: schema,
  },
};

export const handler = middy(baseHandler)
  .use(xssSanitizer())
  .use(jsonBodyParser())
  .use(validator({ inputSchema: schemaWrapper }))
  .use(JSONErrorHandlerMiddleware())
  .use(cors({ headers: "*", methods: "*" }));
