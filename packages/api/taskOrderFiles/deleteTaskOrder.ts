import { DeleteObjectCommand, DeleteObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorCodes } from "../models/Error";
import { ErrorResponse, ErrorStatusCode, NoContentResponse } from "../utils/response";
import { isPathParameterPresent } from "../utils/validation";

const bucketName = process.env.DATA_BUCKET;
export const NO_SUCH_TASK_ORDER_FILE = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "TaskOrderId must be specified in the URL path" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Deletes a Task Order PDF
 *
 * @param event - The DELETE request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const taskOrderId = event.pathParameters?.taskOrderId;
  if (!isPathParameterPresent(taskOrderId)) {
    return NO_SUCH_TASK_ORDER_FILE;
  }

  try {
    await deleteFile(taskOrderId);
  } catch (err) {
    console.log("Unexpected error: " + err);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Unexpected error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
  return new NoContentResponse();
}

async function deleteFile(taskOrderId: string): Promise<DeleteObjectCommandOutput> {
  const client = new S3Client({});
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: taskOrderId,
  });
  const result = await client.send(command);
  return result;
}
