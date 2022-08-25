import { PeriodUnit, PeriodType, DocumentType } from "../../models/document-generation";
import { capitalize, convertPeriodToMonths, getPDFDocumentTemplates, getExcelTemplatePath } from "./utils";
import * as fs from "fs";

jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

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

describe("getPDFDocumentTemplates", () => {
  it("should return the PDF template files", async () => {
    // GIVEN
    const html = "<H1>ATAT {{to_title}}</H1>";
    const css = `h1 {
      font-size: 1.9rem;
      text-transform: uppercase;
      margin-bottom: 2.4rem !important;
      text-align: center;
      margin-top: 0;
    }`;

    // WHEN / ACT
    mockedFs.readFileSync.mockImplementationOnce(() => html);
    mockedFs.readFileSync.mockImplementationOnce(() => css);

    // THEN
    expect(getPDFDocumentTemplates(DocumentType.DESCRIPTION_OF_WORK)).toEqual({ html, css });
  });
  it("should throw an error if invalid PDF documentType", async () => {
    const documentType = "RANDOM_PDF_DOCUMENT_TYPE" as unknown as DocumentType;
    expect(() => getPDFDocumentTemplates(documentType)).toThrow(
      `Unsupported PDF generation type: "RANDOM_PDF_DOCUMENT_TYPE"`
    );
  });
});

describe("getExcelTemplatePath", () => {
  it("should return template path for IGCE document", async () => {
    const igcePath = "/opt/igce-template.xlsx";
    expect(getExcelTemplatePath(DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE)).toBe(igcePath);
  });
  it("should throw an error if invalid Excel documentType", async () => {
    const documentType = "RANDOM_EXCEL_DOCUMENT_TYPE" as unknown as DocumentType;
    expect(() => getExcelTemplatePath(documentType)).toThrow(
      `Unsupported Excel generation type: "RANDOM_EXCEL_DOCUMENT_TYPE"`
    );
  });
});
