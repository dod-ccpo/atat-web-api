import { PortfolioStep } from "../models/PortfolioStep";

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
  if (typeof object !== "object" || object === null) {
    return false;
  }
  return ["name", "description", "dod_components", "portfolio_managers"].every((item) => item in object);
}
