import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, NoContentResponse } from "../utils/response";
import { S3Client, DeleteObjectCommand, DeleteObjectCommandOutput } from "@aws-sdk/client-s3";
import { FileMetadata, FileScanStatus } from "../models/FileMetadata";
import * as parser from "lambda-multipart-parser";
import { ErrorCodes } from "../models/Error";
import { isPathParameterPresent } from "../utils/validation";

const bucketName = process.env.PENDING_BUCKET;
export const NO_SUCH_TASK_ORDER_FILE = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "TaskOrderNumber must be specified in the URL path" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * Creates a new Task Order File
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // const result = await parser.parse(event);
  const taskOrderNumber = event.pathParameters?.taskOrderNumber;
  if (!isPathParameterPresent(taskOrderNumber)) {
    return NO_SUCH_TASK_ORDER_FILE;
  }

  try {
    await deleteFile(taskOrderNumber);
  } catch (err) {
    console.log("Unexpected error: " + err);
    return new ErrorResponse(
      { code: ErrorCodes.OTHER, message: "Unexpected error" },
      ErrorStatusCode.INTERNAL_SERVER_ERROR
    );
  }
  return new NoContentResponse();
}

async function deleteFile(taskOrderNumber: string): Promise<DeleteObjectCommandOutput> {
  const client = new S3Client({});
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: taskOrderNumber,
  });
  const result = await client.send(command);
  return result;
}
