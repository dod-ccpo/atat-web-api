import { PortfolioStep } from "../models/PortfolioStep";
/**
 * Check whether a given string is valid JSON
 *
 * @param str - The String to check
 * @returns true if JSON.parse is successful, otherwise returns false
 */
export function isValidJson(str: string) {
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
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link PortfolioStep}
 */
export function isPortfolioStep(object: any): object is PortfolioStep {
  return "name" in object && "description" in object && "dod_components" in object && "portfolio_managers" in object;
}
