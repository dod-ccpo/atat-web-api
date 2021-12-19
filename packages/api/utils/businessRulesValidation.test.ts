import { uniqueNameValidator } from "./businessRulesValidation";

describe("uniqueNameValidator", function () {
  it("should throw an error if name is not unique", async () => {
    const name = "apple";
    const names = ["orange", "apple"];
    expect(() => uniqueNameValidator(name, names)).toThrowError("Duplicate name. Name must be unique.");
  });
});
