import { S3Client } from "@aws-sdk/client-s3";

// Create SQS service object.
export const s3Client = new S3Client({ useFipsEndpoint: true });
