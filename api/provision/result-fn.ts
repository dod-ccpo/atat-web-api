import { Context } from "aws-lambda";
import { sqsClient } from "../../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import validator from "@middy/validator";
import { wrapSchema } from "../../utils/middleware/schema-wrapper";
import { provisioningResponseSchema } from "../../models/provisioning-jobs";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { errorHandlingMiddleware } from "../../utils/middleware/error-handling-middleware";

/**
 * Result Lambda - Takes Step Fn input and sends to SQS Queue to be consumed
 * by a scheduled job in Service Now.
 *
 * @param stateInput - input to the state task that is processed
 */

export async function baseHandler(stateInput: any, context?: Context): Promise<unknown> {
  const QUEUE_URL = process.env.PROVISIONING_QUEUE_URL ?? "";

  // if (stateInput.cspResponse) {
  //   return new ValidationErrorResponse("Request failed validation", {
  //     issue: errorMessage,
  //     name: error.name,
  //   });
  //
  //   return new ValidationErrorResponse("Request failed validation", error.details as Record<string, unknown>);
  // }

  console.log("Sending result message to " + QUEUE_URL);
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(stateInput),
    })
  );

  return { ...stateInput, statusCode: 200 };
}

export const handler = middy(baseHandler)
  .use(validator({ ajvOptions: { verbose: true }, inputSchema: provisioningResponseSchema }))
  .use(errorHandlingMiddleware());
