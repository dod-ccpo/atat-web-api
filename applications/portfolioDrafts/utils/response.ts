import { APIGatewayProxyResult } from "aws-lambda";
import { BaseDocument } from "../models/BaseDocument";
import { Error } from "../models/Error";

type Headers = { [header: string]: string | number | boolean } | undefined;
type MultiValueHeaders = { [header: string]: (string | number | boolean)[] } | undefined;

abstract class Response implements APIGatewayProxyResult {
  statusCode: number;
  body: string;
  headers?: Headers;
  multiValueHeaders?: MultiValueHeaders;
  isBase64Encoded?: boolean | undefined;

  constructor(
    body: string,
    statusCode: number,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders,
    isBase64Encoded?: boolean
  ) {
    this.body = body;
    this.statusCode = statusCode;
    this.headers = headers;
    this.multiValueHeaders = multiValueHeaders;
    this.isBase64Encoded = isBase64Encoded;
  }
}

export class SuccessResponse extends Response {
  constructor(
    response: BaseDocument,
    statusCode = 200,
    headers: Headers = undefined,
    multiValueHeaders: MultiValueHeaders = undefined,
    isBase64Encoded?: boolean
  ) {
    super(JSON.stringify(response), statusCode, headers, multiValueHeaders, isBase64Encoded);
  }
}

export class ErrorResponse extends Response {
  constructor(
    error: Error,
    statusCode: number,
    headers: Headers = undefined,
    multiValueHeaders: MultiValueHeaders = undefined,
    isBase64Encoded?: boolean
  ) {
    super(JSON.stringify(error), statusCode, headers, multiValueHeaders, isBase64Encoded);
  }
}
