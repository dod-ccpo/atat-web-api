import createError from "http-errors";

/**
 * Checks if a name is unique in an array of names and
 * throws an error if there is a duplicate
 *
 * Used for Business rule 3.3 - ensure that names are unique
 *
 * @param name - name sent in by request body
 * @param names - an array of names to check for duplication
 * @returns void - throws an error if duplicate name found otherwise does nothing
 */
export function uniqueNameValidator(name: string, names: Array<string>): void {
  if (names.includes(name)) {
    throw createError(400, "Duplicate name. Name must be unique.", {
      errorName: "DuplicateName",
      duplicateName: name,
    });
  }
}
