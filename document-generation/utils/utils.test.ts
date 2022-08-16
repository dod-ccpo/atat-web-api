import { PeriodUnit, PeriodType } from "../../models/document-generation";
import { capitalize, convertPeriodToMonths } from "./utils";

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

describe("convertPeriodToMonths", () => {
  const period = {
    periodType: PeriodType.OPTION,
    periodUnitCount: 2,
    periodUnit: PeriodUnit.YEAR,
    optionOrder: 2,
  };
  it("should return number of months from years", async () => {
    const yearPeriod = {
      ...period,
      periodUnitCount: 2,
      periodUnit: PeriodUnit.YEAR,
    };
    expect(convertPeriodToMonths(yearPeriod)).toEqual(24);
  });
  it("should return number of months", async () => {
    const monthPeriod = {
      ...period,
      periodUnitCount: 6,
      periodUnit: PeriodUnit.MONTH,
    };
    expect(convertPeriodToMonths(monthPeriod)).toEqual(6);
  });
  it("should return a whole number of months from weeks", async () => {
    const weekPeriod = {
      ...period,
      periodUnitCount: 12,
      periodUnit: PeriodUnit.WEEK,
    };
    expect(convertPeriodToMonths(weekPeriod)).toEqual(3);
  });
  it("should return a whole number of months from days", async () => {
    const dayPeriod = {
      ...period,
      periodUnitCount: 45,
      periodUnit: PeriodUnit.DAY,
    };
    expect(convertPeriodToMonths(dayPeriod)).toEqual(2);
  });
});
