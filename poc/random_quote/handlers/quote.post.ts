import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createHash } from "crypto";
import { ApiResult, ErrorResult } from "../../lib/response";
import { isQuote, missingQuoteField, Quote } from "../lib/quote";

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const CLIENT = new DynamoDBClient({});

/**
 * Creates a result object for when an attribute is missing from the input object.
 *
 * @param field - The field that is missing in the request
 */
function missingField(field: string): ErrorResult {
  return {
    errorCode: "MissingAttribute",
    errorMessage: `The attribute ${field} is a required field`,
  };
}

/**
 * Creates a result object for when the object is missing from the request
 */
function missingQuote(): ErrorResult {
  return {
    errorCode: "MissingItem",
    errorMessage: "A valid quote must be provided in the request body",
  };
}

/**
 * Creates an error result object for when a quote is already in the database.
 */
function alreadyExists(): ErrorResult {
  return {
    errorCode: "AlreadyExists",
    errorMessage: "The quote already exists in the database",
  };
}

/**
 * Creates an error result object for when there is an error communicating with
 * the database.
 */
function databaseError(): ErrorResult {
  return {
    errorCode: "DatabaseError",
    errorMessage: "Unable to write the quote to the database",
  };
}

/**
 * Handles requests from the API Gateway.
 *
 * @param event - The POST request from API Gateway
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body.trim()) {
    return new ApiResult(400, missingQuote());
  }

  try {
    JSON.parse(event.body);
  } catch (err) {
    return new ApiResult(400, missingQuote());
  }

  const body = JSON.parse(event.body);

  if (!isQuote(body)) {
    return new ApiResult(400, missingField(missingQuoteField(body)));
  }
  const newQuote: Quote = body as Quote;
  const quoteId = createHash("sha256")
    .update(newQuote.text + newQuote.from)
    .digest("hex");

  const putCommand = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      id: { S: quoteId },
      text: { S: newQuote.text },
      from: { S: newQuote.from },
    },
  });

  try {
    await CLIENT.send(putCommand);
  } catch (err) {
    console.log(err);
    return new ApiResult(400, databaseError());
  }
  return new ApiResult(200, { result: { id: quoteId, ...newQuote } });
};
