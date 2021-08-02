import { APIGatewayProxyResult } from "aws-lambda";
import { BaseDocument } from "../models/BaseDocument";
import { Error } from "../models/Error";

type Headers = { [header: string]: string | number | boolean } | undefined;
type MultiValueHeaders = { [header: string]: (string | number | boolean)[] } | undefined;

export class SuccessResponse implements APIGatewayProxyResult {
  statusCode: number;
  headers?: Headers;
  multiValueHeaders?: MultiValueHeaders;
  body: string;
  isBase64Encoded: boolean;

  constructor(
    response: BaseDocument,
    statusCode = 200,
    headers: Headers = {},
    multiValueHeaders: MultiValueHeaders = {},
    isBase64Encoded = false
  ) {
    this.body = JSON.stringify(response);
    this.statusCode = statusCode;
    this.headers = headers;
    this.multiValueHeaders = multiValueHeaders;
    this.isBase64Encoded = isBase64Encoded;
  }
}

export class ErrorResponse implements APIGatewayProxyResult {
  statusCode: number;
  headers?: Headers;
  multiValueHeaders?: MultiValueHeaders;
  body: string;
  isBase64Encoded: boolean;

  constructor(
    response: Error,
    statusCode: number,
    headers: Headers = {},
    multiValueHeaders: MultiValueHeaders = {},
    isBase64Encoded = false
  ) {
    this.body = JSON.stringify(response);
    this.statusCode = statusCode;
    this.headers = headers;
    this.multiValueHeaders = multiValueHeaders;
    this.isBase64Encoded = isBase64Encoded;
  }
}
