import { ErrorStatusCode, OtherErrorResponse } from "./response";

/**
 * To be used when a server side error occurs.  Hides error/implementation details.
 */
export const INTERNAL_SERVER_ERROR = new OtherErrorResponse("Server error", ErrorStatusCode.INTERNAL_SERVER_ERROR);

/**
 * To be used when a request body exists but is invalid
 * Could be invalid because:
 *  - request body is not of the expected Content-Type (for example, application/json)
 *  - is not valid JSON
 *  - when JSON, is not of the expected type (for example, doesn't look like Portfolio
 * provisioning request)
 */
export const REQUEST_BODY_INVALID = new OtherErrorResponse(
  "A valid request body must be provided",
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used in the interim until a feature has been implemented.
 */
export const NOT_IMPLEMENTED = new OtherErrorResponse("Not implemented", ErrorStatusCode.NOT_IMPLEMENTED);
