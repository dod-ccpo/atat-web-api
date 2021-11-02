import { NO_SUCH_PORTFOLIO_DRAFT, REQUEST_BODY_INVALID } from "./errors";
import { SetupError, SetupResult, SetupSuccess, ValidationErrorResponse } from "./response";
import { isValidUuidV4, isValidDate, isClin, isClinNumber, isFundingAmount } from "./validation";
import { ApiGatewayEventParsed } from "./eventHandlingTool";
import { FundingStep, ValidationMessage } from "../models/FundingStep";
import { Clin } from "../models/Clin";
import createError from "http-errors";
import { ErrorCode } from "../models/Error";
/**
 * Check if incoming POST Request passes basic shape validation
 *
 * @param event - The incoming API Gateway Request proxied to Lambda
 * @param extraValidators - Additional validators that check whether the body is a valid object of Type T
 * @returns SetUpSuccess object if event passes validation, otherwise it returns SetUpError
 */
export function shapeValidationForPostRequest<T>(
  event: ApiGatewayEventParsed<T>,
  ...extraValidators: Array<(obj: unknown) => obj is T>
): SetupResult<T> {
  if (!isValidUuidV4(event.pathParameters?.portfolioDraftId)) {
    return new SetupError(NO_SUCH_PORTFOLIO_DRAFT);
  }
  const portfolioDraftId = event.pathParameters!.portfolioDraftId!;
  const bodyResult = event.body;
  if (bodyResult === undefined) {
    return new SetupError(REQUEST_BODY_INVALID);
  }
  for (const validator of extraValidators) {
    if (!validator(event.body)) {
      return new SetupError(REQUEST_BODY_INVALID);
    }
  }

  return new SetupSuccess<T>({ portfolioDraftId }, bodyResult as unknown as T);
}

export interface ClinValidationError {
  clinNumber: string;
  invalidParameterName: string;
  invalidParameterValue: string;
  validationMessage: ValidationMessage;
}

export async function validateFundingStepClins(fs: FundingStep): Promise<void> {
  const errors = fs.task_orders
    .flatMap((taskOrder) => taskOrder.clins)
    .map(validateClin)
    .reduce((accumulator, validationErrors) => accumulator.concat(validationErrors), []);
  if (errors.length) {
    createValidationErrorResponse({ input_validation_errors: errors });
  }
}

/**
 * Validates the given clin object
 * @param clin an object that looks like a Clin
 * @returns a collection of clin validation errors
 */

export function validateClin(clin: Clin): Array<ClinValidationError> {
  const errors = Array<ClinValidationError>();
  if (new Date(clin.pop_start_date) >= new Date(clin.pop_end_date)) {
    const obj = {
      clinNumber: clin.clin_number,
      validationMessage: ValidationMessage.START_BEFORE_END,
    };

    errors.push({
      ...obj,
      invalidParameterName: "pop_start_date",
      invalidParameterValue: clin.pop_start_date,
    });
    errors.push({
      ...obj,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: clin.pop_end_date,
    });
  }
  if (new Date() >= new Date(clin.pop_end_date)) {
    errors.push({
      clinNumber: clin.clin_number,
      invalidParameterName: "pop_end_date",
      invalidParameterValue: clin.pop_end_date,
      validationMessage: ValidationMessage.END_FUTURE,
    });
  }

  if (clin.obligated_funds > clin.total_clin_value) {
    const obj = {
      clinNumber: clin.clin_number,
      validationMessage: ValidationMessage.TOTAL_GT_OBLIGATED,
    };
    errors.push({
      ...obj,
      invalidParameterName: "obligated_funds",
      invalidParameterValue: clin.obligated_funds.toString(),
    });
    errors.push({
      ...obj,
      invalidParameterName: "total_clin_value",
      invalidParameterValue: clin.total_clin_value.toString(),
    });
  }
  return errors;
}

/**
 * Returns an error response containing 1) an error map containing the specified invalid properties, 2) an error code, 3) a message
 * @param invalidProperties object containing property names and their values which failed validation
 * @returns ValidationErrorResponse containing an error map, error code, and a message
 */

export function createValidationErrorResponse(invalidProperties: Record<string, unknown>): ValidationErrorResponse {
  if (Object.keys(invalidProperties).length === 0) {
    throw Error("Parameter 'invalidProperties' must not be empty");
  }
  Object.keys(invalidProperties).forEach((key) => {
    if (!key) throw Error("Parameter 'invalidProperties' must not have empty string as key");
  });
  // return new ValidationErrorResponse("Invalid input", invalidProperties);
  const error = createError(400, ValidationMessage.END_FUTURE);
  error.code = ErrorCode.INVALID_INPUT;
  error.details = invalidProperties;
  throw error;
}
