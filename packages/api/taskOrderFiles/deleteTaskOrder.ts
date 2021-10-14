import { DeleteObjectCommand, DeleteObjectCommandOutput } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ErrorStatusCode, NoContentResponse, OtherErrorResponse } from "../utils/response";
import { isPathParameterPresent } from "../utils/validation";
import { s3Client } from "../utils/aws-sdk/s3";

const bucketName = process.env.DATA_BUCKET;
export const NO_SUCH_TASK_ORDER_FILE = new OtherErrorResponse(
  "TaskOrderId must be specified in the URL path",
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
    return new OtherErrorResponse("Unexpected error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
  }
  return new NoContentResponse();
}

async function deleteFile(taskOrderId: string): Promise<DeleteObjectCommandOutput> {
  return s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: taskOrderId,
    })
  );
}
