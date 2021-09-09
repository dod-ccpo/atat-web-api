import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as parser from "lambda-multipart-parser";
import { v4 as uuidv4 } from "uuid";
import { FileMetadata, FileScanStatus } from "../models/FileMetadata";
import { ApiSuccessResponse, ErrorStatusCode, OtherErrorResponse, SuccessStatusCode } from "../utils/response";

const bucketName = process.env.DATA_BUCKET;

/**
 * Uploads a Task Order PDF
 *
 * @param event - The POST request from API Gateway
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const result = await parser.parse(event);

  if (result.files.length !== 1) {
    return new OtherErrorResponse("Expected exactly one file.", ErrorStatusCode.BAD_REQUEST);
  }

  const file = result.files[0];
  if (file.contentType !== "application/pdf") {
    return new OtherErrorResponse("Expected a PDF file", ErrorStatusCode.BAD_REQUEST);
  }

  try {
    return await uploadFile(file);
  } catch (error) {
    console.error("Unexpected error: " + error);
    return new OtherErrorResponse("Unexpected error", ErrorStatusCode.INTERNAL_SERVER_ERROR);
  }
}

async function uploadFile(file: parser.MultipartFile): Promise<APIGatewayProxyResult> {
  const client = new S3Client({});
  const key = uuidv4();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file.content,
    ContentType: file.contentType,
  });
  await client.send(command);
  const now = new Date().toISOString();
  const metadata: FileMetadata = {
    id: key,
    created_at: now,
    updated_at: now,
    status: FileScanStatus.PENDING,
    size: file.content.length,
    name: file.filename,
  };
  return new ApiSuccessResponse<FileMetadata>(metadata, SuccessStatusCode.CREATED);
}
