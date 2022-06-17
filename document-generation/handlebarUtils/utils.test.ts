import { capitalize } from "./utils";

describe("capitalize", () => {
  it.each(["atat", "hoTH", "API", "DoW"])("should return capitalized word", async (string) => {
    const capitalizedWord = capitalize(string);
    expect(capitalizedWord).toBe(`${string.charAt(0).toLocaleUpperCase()}${string.slice(1).toLocaleLowerCase()}`);
  });
  it.each([1, "", undefined, null, {}, false, true])("should return empty string if not a string", async (item) => {
    const emptyString = capitalize(item as any);
    expect(emptyString).toBe("");
  });
});
