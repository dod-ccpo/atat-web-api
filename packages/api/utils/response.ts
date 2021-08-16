import { APIGatewayProxyResult } from "aws-lambda";
import { Error, ErrorCodes } from "../models/Error";

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
  isBase64Encoded?: boolean | undefined;

  /**
   * Build an API response.
   *
   * For specific details on the fields in a response object, review
   * [the API docs]{@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format}.
   *
   * @param body - The JSON string response body
   * @param statuscode - The HTTP status code for the response
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
    statusCode: SuccessStatusCode = SuccessStatusCode.OK,
    headers?: Headers,
    multiValueHeaders?: MultiValueHeaders
  ) {
    super(response, statusCode, headers, multiValueHeaders, false);
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
 * An error response to an API request.
 */
export class ErrorResponse extends Response {
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
 * To be used when a database error occurs.  Hides error/implementation details.
 */
export const DATABASE_ERROR = new ErrorResponse(
  { code: ErrorCodes.OTHER, message: "Database error" },
  ErrorStatusCode.INTERNAL_SERVER_ERROR
);

/**
 * To be used when a request body is required but was not provided
 */
export const REQUEST_BODY_EMPTY = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Request body must not be empty" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when a request body exists but is invalid
 * Could be invalid because:
 *  - request body is not of the expected Content-Type (for example, application/json, or application/pdf)
 *  - is not valid JSON / PDF
 *  - when JSON, is not of the expected type (for example, doesn't look like PortfolioStep/FundingStep/ApplicationStep)
 */
export const REQUEST_BODY_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "A valid request body must be provided" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when a request parameter exists but is invalid
 * Could be invalid because:
 *  - has the wrong form (for example, uuid or date expected but won't parse)
 *  - is out of range (for example, integer not in the accepted range)
 */
export const QUERY_PARAM_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Invalid request parameter" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when an expected path variable exists but is invalid
 * Could be invalid because:
 *  - has the wrong form (for example, uuid expected but won't parse)
 */
export const PATH_VARIABLE_INVALID = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Invalid path variable" },
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when the specified Portfolio Draft is not found
 */
export const NO_SUCH_PORTFOLIO_DRAFT = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Draft with the given ID does not exist" },
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a Portfolio Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_PORTFOLIO_STEP = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Portfolio Step not found for this Portfolio Draft" },
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a Funding Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_FUNDING_STEP = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Funding Step not found for this Portfolio Draft" },
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a Application Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_APPLICATION_STEP = new ErrorResponse(
  { code: ErrorCodes.INVALID_INPUT, message: "Application Step not found for this Portfolio Draft" },
  ErrorStatusCode.NOT_FOUND
);
