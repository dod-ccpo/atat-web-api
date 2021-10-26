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
 * To be used when an error occurs when sending emails
 */
export const EMAIL_NO_TRANSPORT_ERROR = {
  message: "No smtp transporter found",
  code: ErrorStatusCode.INTERNAL_SERVER_ERROR,
};
/**
 * To be used when secrets are not retrieved from secrets managers
 */
export const SECRETS_NOT_RETRIEVED = {
  message: "Could not retrieve secret value ",
  code: ErrorStatusCode.INTERNAL_SERVER_ERROR,
};
