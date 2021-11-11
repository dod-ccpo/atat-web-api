import { APIGatewayProxyResult, APIGatewayProxyEvent, Context } from "aws-lambda";
import { sqsClient } from "../utils/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { ApiSuccessResponse, SuccessStatusCode } from "../../api/utils/response";
import middy from "@middy/core";
import xssSanitizer from "../../api/portfolioDrafts/xssSanitizer";
import jsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import validator from "@middy/validator";
import { ErrorStatusCode } from "../utils/statusCodesAndErrors";
import { IpCheckerMiddleware } from "../../api/utils/ipLogging";

const QUEUE_URL = process.env.ATAT_QUEUE_URL ?? "";

export async function baseHandler(event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult> {
  try {
    const response = await sqsClient.send(
      new SendMessageCommand({ MessageBody: JSON.stringify(event.body), QueueUrl: QUEUE_URL })
    );
    return new ApiSuccessResponse({ sqsResponse: response, messageBody: event.body }, SuccessStatusCode.ACCEPTED);
  } catch (error) {
    return {
      statusCode: ErrorStatusCode.INTERNAL_SERVER_ERROR,
      body: `Could not send message to EmailQueue. ${error}`,
    };
  }
}

// TODO: remove once importing of spec for middy is implemented
export const schema = {
  required: ["emails", "emailType", "missionOwner"],
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
    missionOwner: {
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
  .use(cors({ headers: "*", methods: "*" }))
  .use(IpCheckerMiddleware());
