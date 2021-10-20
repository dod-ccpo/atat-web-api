import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { sqsClient } from "../utils/aws-sdk/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { DATABASE_ERROR, REQUEST_BODY_INVALID } from "../utils/errors";
import { ApiSuccessResponse, SuccessStatusCode } from "../utils/response";
import { isBodyPresent } from "../utils/validation";

const QUEUE_URL = process.env.ATAT_QUEUE_URL ?? "";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (isBodyPresent(event.body)) {
    return REQUEST_BODY_INVALID;
  }

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
