import { ErrorStatusCode, OtherErrorResponse } from "./response";

/**
 * To be used when a database error occurs.  Hides error/implementation details.
 */
export const DATABASE_ERROR = new OtherErrorResponse("Database error", ErrorStatusCode.INTERNAL_SERVER_ERROR);

/**
 * To be used when a request body is required but was not provided
 */
export const REQUEST_BODY_EMPTY = new OtherErrorResponse("Request body must not be empty", ErrorStatusCode.BAD_REQUEST);

/**
 * To be used when a request body is provided but must be empty
 */
export const REQUEST_BODY_NOT_EMPTY = new OtherErrorResponse("Request body must be empty", ErrorStatusCode.BAD_REQUEST);

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

/**
 * To be used when a request parameter exists but is invalid
 * Could be invalid because:
 *  - has the wrong form (for example, uuid or date expected but won't parse)
 *  - is out of range (for example, integer not in the accepted range)
 */
export const QUERY_PARAM_INVALID = new OtherErrorResponse("Invalid request parameter", ErrorStatusCode.BAD_REQUEST);

/**
 * To be used when a required path parameter is not received (not present or empty)
 */
export const PATH_PARAMETER_REQUIRED_BUT_MISSING = new OtherErrorResponse(
  "Required path parameter is missing",
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when the specified Portfolio Draft is not found
 */
export const NO_SUCH_PORTFOLIO_DRAFT_404 = new OtherErrorResponse(
  "Portfolio Draft with the given ID does not exist",
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a specified Portfolio Draft does not exist
 */
export const NO_SUCH_PORTFOLIO_DRAFT_400 = new OtherErrorResponse(
  "The given Portfolio Draft does not exist",
  ErrorStatusCode.BAD_REQUEST
);

/**
 * To be used when a Portfolio Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_PORTFOLIO_STEP = new OtherErrorResponse(
  "Portfolio Step not found for this Portfolio Draft",
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a Funding Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_FUNDING_STEP = new OtherErrorResponse(
  "Funding Step not found for this Portfolio Draft",
  ErrorStatusCode.NOT_FOUND
);

/**
 * To be used when a Application Step is not found for a specified Portfolio Draft
 */
export const NO_SUCH_APPLICATION_STEP = new OtherErrorResponse(
  "Application Step not found for this Portfolio Draft",
  ErrorStatusCode.NOT_FOUND
);
/**
 * To be used when an Application is not found
 */
export const NO_SUCH_APPLICATION = new OtherErrorResponse("Application not found", ErrorStatusCode.NOT_FOUND);

/**
 * To be used when a function has not been implemented
 */
export const NOT_IMPLEMENTED = new OtherErrorResponse("Not implemented", ErrorStatusCode.NOT_FOUND);

/**
 * To be used when a function has not been implemented
 */
export const PORTFOLIO_ALREADY_SUBMITTED = new OtherErrorResponse(
  "Portfolio Draft with the given ID has already been submitted",
  ErrorStatusCode.BAD_REQUEST
);
