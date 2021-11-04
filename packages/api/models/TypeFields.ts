/**
 * An exhaustive list of all properties of a type.
 *
 * Unfortunately, there isn't a clean way to represent this as being a list; however,
 * we can make it a mapping (that just maps to null).
 */
export type ExhaustivePropertyMap<T> = { [key in keyof T]: null };

function pick<T>(obj: T, ...keys: Array<keyof T>): T {
  const entries = keys.map((key) => [key, obj[key]]);
  return Object.fromEntries(entries);
}

function allProperties<T>(map: ExhaustivePropertyMap<T>): Array<keyof T> {
  return Object.keys(map) as Array<keyof T>;
}

export function containsExactlyProperties<T>(obj: unknown, map: ExhaustivePropertyMap<T>): obj is T {
  if (obj === undefined || typeof obj !== "object" || obj == null) {
    return false;
  }
  const requiredKeys = allProperties(map) as string[];
  const actualKeys = Object.keys(obj);
  return requiredKeys.length === actualKeys.length && requiredKeys.every((required) => actualKeys.includes(required));
}

export function exhaustivePick<T>(obj: T, map: ExhaustivePropertyMap<T>): T {
  return pick(obj, ...allProperties(map));
}
