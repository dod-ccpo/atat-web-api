import { ErrorStatusCode, OtherErrorResponse } from "./response";

/**
 * To be used when a server side error occurs.  Hides error/implementation details.
 */
export const INTERNAL_SERVER_ERROR = new OtherErrorResponse("Server error", ErrorStatusCode.INTERNAL_SERVER_ERROR);

/**
 * To be used when a request body exists but is invalid
 * Could be invalid because:
 *  - request body is not of the expected Content-Type (for example, application/json, or application/pdf)
 *  - is not valid JSON / PDF
 *  - when JSON, is not of the expected type (for example, doesn't look like PortfolioStep/FundingStep/ApplicationStep)
 */
export const REQUEST_BODY_INVALID = new OtherErrorResponse(
  "A valid request body must be provided",
  ErrorStatusCode.BAD_REQUEST
);
