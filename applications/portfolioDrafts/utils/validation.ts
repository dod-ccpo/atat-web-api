/**
 * Check whether a given string is valid JSON
 *
 * @param str - The String to check
 * @returns true if JSON.parse is successful, otherwise returns false
 */
export function IsValidJson(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
