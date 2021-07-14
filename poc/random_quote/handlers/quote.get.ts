import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const client = new DynamoDBClient({});
    // TODO: Grab a random quote from DynamoDB
    console.log(event.path);
    return {
        statusCode: 200,
        body: "Hello, World"
    };
}