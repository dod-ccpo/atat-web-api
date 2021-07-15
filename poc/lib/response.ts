import { APIGatewayProxyResult } from "aws-lambda";

/**
 * A standard error result to return when an API call fails
 */
export interface ErrorResult {
  errorCode: string;
  errorMessage: string;
}

export interface SuccessResult<T> {
  nextToken?: string;
  pageId?: number;
  result: T;
}

type ResultHeaders = { [header: string]: string };
type ResultBody<T> = ErrorResult | SuccessResult<T>;

export class ApiResult<T> implements APIGatewayProxyResult {
  statusCode: number;
  headers: ResultHeaders = {};
  body: string;

  constructor(statusCode: number, body?: ResultBody<T>, headers?: ResultHeaders) {
    this.statusCode = statusCode;
    this.headers["Content-Type"] = "application/json";
    if (headers) {
      this.headers = { ...this.headers, ...headers };
    }
    if (body) {
      this.body = JSON.stringify(body);
    }
  }
}
