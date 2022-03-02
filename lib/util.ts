const normalizationRejectionRegex = /[\W_]/g;

/**
 * Normalizes environment names.
 *
 * The first letter is capitalized and the rest is made lowercase.
 * Any hyphens or other special characters are stripped.
 *
 * This ensures that accidentally typing "dev" doesn't result in a new
 * environment from "Dev" and that ticket IDs such as "AT-0001" and
 * "AT0001" are treated the same and still mostly look like ticket IDs.
 *
 * @param id The environment identifier
 * @returns The normalized environment name
 */
export function normalizeEnvironmentName(id: string): string {
  const strippedId = id.replace(normalizationRejectionRegex, "");
  if (!strippedId) {
    return strippedId;
  }
  return strippedId[0].toUpperCase() + lowerCaseEnvironmentId(strippedId.slice(1));
}

/**
 * Normalize a lowercase version of the environment ID.
 *
 * In some scenarios, it is idiomatic (or required) to use a lowercase
 * version of the environment ID without special characters. This
 * strips all non-word characters, underscores, and hyphens and returns
 * the lowercase identifier.
 *
 * @param id The environment identifier
 * @returns the normalized lowercase identifier for the environment
 */
export function lowerCaseEnvironmentId(id: string): string {
  return id.toLowerCase().replace(normalizationRejectionRegex, "");
}

/**
 * Helper type guard to check whether an input is a string
 * @param str the input to test
 * @returns true if the input is a non-empty string and false otherwise
 */
export function isString(str: unknown): str is string {
  if (str && typeof str === "string") {
    return true;
  }
  return false;
}

/**
 * Checks whether the given environment ID may be considered temporary or
 * not. This is not a complete check and should be understood to be based on
 * a general guess. Returning true does not necessarily mean the environment is
 * absolutely temporary.
 *
 * @param environmentId the environment id to check
 * @returns true if the environment ID looks like it is for a temporary environment
 */
// TODO: Replace with a more complete means of indicating an environment is not a
// long-lived environment.
export function isPossibleTemporaryEnvironment(environmentId: string): boolean {
  return !/^(sandbox|dev|stag|prod)/.test(environmentId);
}