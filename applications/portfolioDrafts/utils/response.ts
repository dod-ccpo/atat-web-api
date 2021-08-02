import { APIGatewayProxyResult } from "aws-lambda";
import { BaseDocument } from "../models/BaseDocument";
import { Error } from "../models/Error";

type Headers = { [header: string]: string | number | boolean } | undefined;
type MultiValueHeaders = { [header: string]: (string | number | boolean)[] } | undefined;

export enum SuccessStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
}

export enum ErrorStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
}

abstract class Response implements APIGatewayProxyResult {
  statusCode: number;
  body: string;
  headers?: Headers;
  multiValueHeaders?: MultiValueHeaders;
  isBase64Encoded?: boolean | undefined;

  constructor(
    body: string,
    statusCode: SuccessStatusCode | ErrorStatusCode,
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
    statusCode: SuccessStatusCode = SuccessStatusCode.OK,
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
    statusCode: ErrorStatusCode,
    headers: Headers = undefined,
    multiValueHeaders: MultiValueHeaders = undefined,
    isBase64Encoded?: boolean
  ) {
    super(JSON.stringify(error), statusCode, headers, multiValueHeaders, isBase64Encoded);
  }
}
