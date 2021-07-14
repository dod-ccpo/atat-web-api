import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { ErrorResult } from "../../lib/response";
import { isQuote, missingQuoteField, Quote } from "../lib/quote";

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const CLIENT = new DynamoDBClient({});

function missingField(field: string): ErrorResult {
  return {
    errorCode: "MissingAttribute",
    errorMessage: `The attribute ${field} is a required field`,
  };
}

function missingQuote(): ErrorResult {
  return {
    errorCode: "MissingItem",
    errorMessage: "A quote must be provided in the request body",
  };
}

function alreadyExists(): ErrorResult {
  return {
    errorCode: "AlreadyExists",
    errorMessage: "The quote already exists in the database",
  };
}

function databaseError(): ErrorResult {
  return {
    errorCode: "DatabaseError",
    errorMessage: "Unable to write the quote to the database",
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify(missingQuote()),
    };
  }
  const body = JSON.parse(event.body);
  if (!isQuote(body)) {
    return {
      statusCode: 400,
      body: JSON.stringify(missingField(missingQuoteField(body))),
    };
  }
  const newQuote: Quote = body as Quote;
  const quoteId = uuidv4();

  // TODO: Check if the quote text already exists
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
    return {
      statusCode: 500,
      body: JSON.stringify(databaseError()),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: quoteId, ...newQuote }),
  };
};
