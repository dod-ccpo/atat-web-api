import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as AWSXRay from "aws-xray-sdk";

const dynamodbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient({}));

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: false, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.
const dynamodbDocumentClient = AWSXRay.captureAWSv3Client(DynamoDBDocumentClient.from(dynamodbClient, translateConfig));

export { dynamodbClient, dynamodbDocumentClient };
