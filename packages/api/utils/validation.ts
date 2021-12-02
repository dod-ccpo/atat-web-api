import { PortfolioStepModel } from "../models/PortfolioStep";
import { validate as uuidValidate, version as uuidVersion } from "uuid";

/**
 * Check whether a given string is a valid v4 UUID.
 * @param str - The string to check
 * @returns true if the string is valid v4 UUID and false otherwise
 */
export function isValidUuidV4(str?: string): boolean {
  return !!str && uuidValidate(str) && uuidVersion(str) === 4;
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
export function isPortfolioStep(object: unknown): object is PortfolioStepModel {
  // Ensure that the given item is a valid object prior to checks its members
  if (!isValidObject(object)) {
    return false;
  }
  return ["name", "csp", "dod_components", "portfolio_managers"].every((item) => item in object);
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
