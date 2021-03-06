/* eslint-disable max-len */
import { APIGatewayProxyResult } from "aws-lambda";

type Headers = { [header: string]: string | number | boolean } | undefined;
type MultiValueHeaders = { [header: string]: (string | number | boolean)[] } | undefined;

/**
 * HTTP success status codes supported by the API.
 */
export enum SuccessStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
}

/**
 * HTTP error status codes returned by the API.
 */
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
/**
 * Error code returned by the API.
 */
export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  OTHER = "OTHER",
}

/**
 * A general error object containing an error code and a message
 * returned by the API.
 */
export interface Error {
  code: ErrorCode;
  message: string;
}

/**
 * A validation error object containing error map of the specific
 * validation errors returned by the API.
 */
export interface ValidationError extends Error {
  code: ErrorCode.INVALID_INPUT;
  errorMap: Record<string, unknown>;
}

/**
 * A generic response to a request from API Gateway.
 *
 * Allows setting the 5 fields that a REST API Proxy request supports for
 * AWS API Gateway.
 */
abstract class Response implements APIGatewayProxyResult {
  statusCode: number;
  body: string;
  headers?: Headers;
  multiValueHeaders?: MultiValueHeaders;
  isBase64Encoded?: boolean;

  /**
   * Build an API response.
   *
   * For specific details on the fields in a response object, review
   * [the API docs]{@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format}.
   *
   * @param body - The JSON string response body
   * @param statusCode - The HTTP status code for the response
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   * @param isBase64Encoded - Whether the body is base64 encoded
   */
  constructor(
    body: string,
    statusCode: number,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders,
    isBase64Encoded?: boolean
  ) {
    headers = { ...headers };

    this.body = body;
    this.statusCode = statusCode;
    this.headers = headers;
    this.multiValueHeaders = multiValueHeaders;
    this.isBase64Encoded = isBase64Encoded;
  }
}

/**
 * A generic successful response to an API request.
 */
abstract class SuccessResponse extends Response {
  /**
   * Create a SuccessResponse.
   *
   * @param response - The JSON string for the response
   * @param statusCode - The HTTP success status code for the response
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(
    response: string,
    statusCode: SuccessStatusCode,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    super(response, statusCode, headers, multiValueHeaders, false);
  }
}

/**
 * A base64 encoded success response to an API request
 */
export class SuccessBase64Response extends Response {
  /**
   * Create a base64 encoded SuccessResponse.
   *
   * @param response - The JSON string for the response
   * @param statusCode - The HTTP success status code for the response
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(
    response: string,
    statusCode: SuccessStatusCode,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    super(response, statusCode, headers, multiValueHeaders, true);
  }
}

/**
 * An API response representing a 204 No Content.
 */
export class NoContentResponse extends SuccessResponse {
  constructor(headers?: Headers, multiValueHeaders?: MultiValueHeaders) {
    super("", SuccessStatusCode.NO_CONTENT, headers, multiValueHeaders);
  }
}

/**
 * An API response that includes a model defined in the API specification.
 */
export class ApiSuccessResponse<T> extends SuccessResponse {
  /**
   * Create a document response for an API request.
   *
   * @param response - The instance of the model to include in the response
   * @param statusCode - The HTTP success status code for the response
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(
    response: T,
    statusCode: SuccessStatusCode = SuccessStatusCode.OK,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    super(JSON.stringify(response), statusCode, headers, multiValueHeaders);
  }
}

/**
 * A base64 encoded success response to an API request
 */
export class ApiBase64SuccessResponse extends SuccessBase64Response {
  /**
   * Create a base64 encoded document response for an API request.
   *
   * @param response - The instance of the model to include in the response
   * @param statusCode - The HTTP success status code for the response
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(
    response: string,
    statusCode: SuccessStatusCode = SuccessStatusCode.OK,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    super(response, statusCode, headers, multiValueHeaders);
  }
}
export abstract class ErrorResponse extends Response {
  /**
   * Create an error response.
   *
   * @param error - An instance of {@link Error} to include in the response
   * @param statusCode - Any supported HTTP error status code
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(error: Error, statusCode: ErrorStatusCode, headers?: Headers, multiValueHeaders?: MultiValueHeaders) {
    super(JSON.stringify(error), statusCode, headers, multiValueHeaders, false);
  }
}

/**
 * An error response to an API request.
 */
export class OtherErrorResponse extends ErrorResponse {
  /**
   * Create an error response.
   *
   * @param message - The error message to return to the caller
   * @param statusCode - The appropriate HTTP error status code
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(message: string, statusCode: ErrorStatusCode, headers?: Headers, multiValueHeaders?: MultiValueHeaders) {
    const error: Error = {
      code: ErrorCode.OTHER,
      message,
    };
    super(error, statusCode, headers, multiValueHeaders);
  }
}

/**
 * A response for validation errors in an API request.
 */
export class ValidationErrorResponse extends ErrorResponse {
  /**
   * Create a 400 error response for validation errors.
   *
   * @param message - The top-level error message to return to the caller
   * @param errorMap - The Error Map object that specifies the errors for various input elements
   * @param headers - HTTP response headers
   * @param multiValueHeaders - HTTP response headers, allowing multiple values for a header
   */
  constructor(
    message: string,
    errorMap: Record<string, unknown>,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    const error: ValidationError = {
      code: ErrorCode.INVALID_INPUT,
      message,
      errorMap,
    };
    super(error, ErrorStatusCode.BAD_REQUEST, headers, multiValueHeaders);
  }
}

/**
 * An error object used in requestValidation, used for shape validation
 *
 * Uses {@link ErrorResponse}
 */
export class SetupError {
  public readonly errorResponse: ErrorResponse;
  constructor(errorResponse: ErrorResponse) {
    this.errorResponse = errorResponse;
  }
}

/**
 * The parsed JSON Object that succeed shape validation
 *
 * @param path - The path parameter of the validated object (example: portfolioDraftId)
 * @param bodyObject - The request body, as the provided type T
 */
export class SetupSuccess<T> {
  public readonly path: { [key: string]: string };
  public readonly bodyObject: T;
  constructor(path: { [key: string]: string }, bodyObject: T) {
    this.path = path;
    this.bodyObject = bodyObject;
  }
}

/**
 * The result of the Setup validation process, either an error or success
 */
export type SetupResult<T> = SetupError | SetupSuccess<T>;
