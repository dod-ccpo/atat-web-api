/**
 * An exhaustive list of all attributes of a type.
 *
 * Unfortunately, there isn't a clean way to represent this as being a list; however,
 * we can make it a mapping (that just maps to null).
 */
export type ExhaustiveAttributeMap<T> = { [key in keyof T]: null };

function pick<T>(obj: T, ...keys: Array<keyof T>): T {
  const entries = keys.map((key) => [key, obj[key]]);
  return Object.fromEntries(entries);
}

function allFields<T>(map: ExhaustiveAttributeMap<T>): Array<keyof T> {
  return Object.keys(map) as Array<keyof T>;
}

export function containsExactlyFields<T>(obj: unknown, map: ExhaustiveAttributeMap<T>): obj is T {
  if (obj === undefined || typeof obj !== "object" || obj == null) {
    return false;
  }
  const requiredKeys = allFields(map) as string[];
  const actualKeys = Object.keys(obj);
  return requiredKeys.length === actualKeys.length && requiredKeys.every((required) => actualKeys.includes(required));
}

export function exhaustivePick<T>(obj: T, map: ExhaustiveAttributeMap<T>): T {
  return pick(obj, ...allFields(map));
}
