import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {v4 as uuid} from "uuid";
import {ApiSuccessResponse, ErrorResponse, ErrorStatusCode, SuccessStatusCode} from "../utils/response";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {FileMetadata, FileScanStatus} from "../models/FileMetadata";
import * as parser from "lambda-multipart-parser"
import {ErrorCodes} from "../models/Error";

const bucketName = process.env.PENDING_BUCKET;

/**
 * Creates a new Task Order File
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const key = uuid();
    const client = new S3Client({});

    try {
        const result = await parser.parse(event);
        if (result.files.length != 1) {
            return new ErrorResponse(
                { code: ErrorCodes.INVALID_INPUT, message: "Expected exactly one file." },
                ErrorStatusCode.BAD_REQUEST
            );
        }
        else {
            let file = result.files[0];
            if (file.contentType != 'application/pdf') {
                return new ErrorResponse(
                    { code: ErrorCodes.INVALID_INPUT, message: "Expected a PDF file" },
                    ErrorStatusCode.BAD_REQUEST
                );
            }
            else {
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: file.content,
                    ContentType: file.contentType
                });
                const response = await client.send(command);
                console.log(response);
                const now = new Date().toISOString();
                const metadata: FileMetadata = {
                    id: key,
                    created_at: now,
                    updated_at: now,
                    status: FileScanStatus.Pending,
                    size: file.content.length,
                    name: file.filename
                };
                return new ApiSuccessResponse<FileMetadata>(metadata, SuccessStatusCode.CREATED);
            }
        }

    } catch (err) {
        console.log("Unexpected error: " + err);
        return new ErrorResponse(
            { code: ErrorCodes.OTHER, message: "Unexpected error" },
            ErrorStatusCode.INTERNAL_SERVER_ERROR
        );
    }

};