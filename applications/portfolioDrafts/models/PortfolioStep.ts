export interface PortfolioStep {
  name: string;
  description: string;
  dod_components: Array<string>;
  portfolio_managers: Array<string>;
}

/**
 * Check whether a given object is a {@link PortfolioStep}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link PortfolioStep}
 */
export function isPortfolioStep(object: any): object is PortfolioStep {
  if ("name" in object && "description" in object && "dod_components" in object && "portfolio_managers" in object) {
    return true;
  }
  return false;
}
