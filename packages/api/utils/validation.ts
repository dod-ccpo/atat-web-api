import { Clin } from "../models/Clin";
import { FundingStep } from "../models/FundingStep";
import { PortfolioStep } from "../models/PortfolioStep";
import { version as uuidVersion, validate as uuidValidate } from "uuid";

/**
 * Check whether a given string is valid JSON.
 *
 * @param str - The string to check
 * @returns true if the string is valid JSON and false otherwise
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Check whether a given string is a valid v4 UUID.
 * @param str - The string to check
 * @returns true if the string is valid v4 UUID and false otherwise
 */
export function isValidUuidV4(str: string): boolean {
  return uuidValidate(str) && uuidVersion(str) === 4;
}

/**
 * Check that the given object is in fact a valid object type.
 *
 * This should reject null, undefined, and non-object types.
 */
// This is a basic and low-level check that should probably not be exported. Any
// object type should have a higher-level interface for validation.
function isValidObject(object: unknown): object is any {
  return object !== undefined && object !== null && typeof object === "object";
}

/**
 * Check whether a given object is a {@link PortfolioStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link PortfolioStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link PortfolioStep}
 */
export function isPortfolioStep(object: unknown): object is PortfolioStep {
  // Ensure that the given item is a valid object prior to checks its members
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "description", "dod_components", "portfolio_managers"].every((item) => item in object);
}

/**
 * Check whether a given object is a {@link FundingStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link FundingStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link FundingStep}
 */
export function isFundingStep(object: unknown): object is FundingStep {
  if (!isValidObject(object)) {
    return false;
  }
  return ["task_order_number", "task_order_file", "csp", "clins"].every((item) => item in object);
}

/**
 * Check whether a given object is a {@link ApplicationStep}.
 *
 * Note that this only asserts that the given object meets the interface. It does not validate
 * that the object is a valid {@link ApplicationStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link ApplicationStep}
 */
export function isApplicationStep(object: unknown): object is ApplicationStep {
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "description", "environments"].every((item) => item in object);
}

/**
 * Check whether the path parameter is present in the request
 *
 * @param str - The string to check
 * @returns true if the string is empty or null
 */
export function isPathParameterPresent(pathParam: string | undefined): pathParam is string {
  return !!pathParam?.trim();
}
/**
 * Check whether a given string body is empty
 *
 * @param body - The body of the request
 * @returns true if the string is empty or null
 */
export function isBodyPresent(body: string | null): body is string {
  const emptyValues = ["", "{}"];
  // Treating a null body object as an empty string is legitimate since
  // an empty string is a forbidden value
  const trimmedBody = body?.replace(/\s/g, "") ?? "";
  return !emptyValues.includes(trimmedBody);
}

/**
 * Check whether a given string is a valid date.
 * The expected format is YYYY-MM-DD (ISO 8601).
 *
 * @param str - The string to check
 * @returns true if the string is a valid date; false otherwise
 */
export function isValidDate(str: string): boolean {
  const date: Date = new Date(str);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check whether a given object is a {@link Clin}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link Clin}
 */
export function isClin(object: unknown): object is Clin {
  if (!isValidObject(object)) {
    return false;
  }
  return ["clin_number", "idiq_clin", "total_clin_value", "obligated_funds", "pop_start_date", "pop_end_date"].every(
    (item) => item in object
  );
}
