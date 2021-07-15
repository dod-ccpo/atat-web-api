export interface Quote {
  /**
   * The text of the quote.
   */
  text: string;
  /**
   * The source of the quote.
   */
  from: string;
}

/**
 * Check whether a given object is a {@link Quote}.
 *
 * @param object - The object to check
 * @returns true if the object has all the attributes of a {@link Quote}
 */
export function isQuote(object: any): object is Quote {
  return "text" in object && "from" in object;
}

/**
 * Find the field that is missing from an object that prevents it from
 * being a {@link Quote}.
 *
 * @param object - The object to check
 * @returns "text" if the "text" attribute is missing and "from" if the "from"
 *          attribute is missing (and "text" is not)
 *
 * @example
 * Always returns "text" when "text" is missing:
 * ```ts
 * missingQuoteField({ from: "" }) === "text";
 * missingQuoteField({ }) === "text";
 * ```
 *
 * @example
 * Only returns "from" when that is the only missing field:
 * ```ts
 * missingQuoteField({ "text": "" }) === "from";
 * missingQUoteField({ }) !== "from";
 * ```
 */
export function missingQuoteField(object: any): string {
  if (isQuote(object)) {
    return undefined;
  }
  return ["text", "from"].find((key) => !(key in object));
}
