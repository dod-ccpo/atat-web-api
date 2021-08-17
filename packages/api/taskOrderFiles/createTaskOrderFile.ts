import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";
import { ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode } from "../utils/response";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { FileMetadata, FileScanStatus } from "../models/FileMetadata";
import * as parser from "lambda-multipart-parser";
import { ErrorCodes } from "../models/Error";

const bucketName = process.env.PENDING_BUCKET;

/**
 * Creates a new Task Order File
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const result = await parser.parse(event);
  if (result.files.length !== 1) {
    return new ErrorResponse(
      { code: ErrorCodes.INVALID_INPUT, message: "Expected exactly one file." },
      ErrorStatusCode.BAD_REQUEST
    );
  } else {
    const file = result.files[0];
    if (file.contentType !== "application/pdf") {
      return new ErrorResponse(
        { code: ErrorCodes.INVALID_INPUT, message: "Expected a PDF file" },
        ErrorStatusCode.BAD_REQUEST
      );
    } else {
      try {
        return await uploadFile(file);
      } catch (err) {
        console.log("Unexpected error: " + err);
        return new ErrorResponse(
          { code: ErrorCodes.OTHER, message: "Unexpected error" },
          ErrorStatusCode.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
};

const uploadFile = async (file: parser.MultipartFile) => {
  const client = new S3Client({});
  const key = uuid();
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
};
