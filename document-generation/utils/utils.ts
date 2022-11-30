import { PeriodUnit, IPeriod, DocumentType, TemplatePaths } from "../../models/document-generation";
import * as fs from "fs";

export const capitalize = (string: string) => {
  if (typeof string !== "string") {
    return "";
  }
  return string.charAt(0).toUpperCase() + string.slice(1).toLocaleLowerCase();
};

export const convertPeriodToMonths = (period: IPeriod): number => {
  const { periodUnit, periodUnitCount } = period;
  switch (periodUnit) {
    case PeriodUnit.YEAR:
      return periodUnitCount * 12;
    case PeriodUnit.MONTH:
      return periodUnitCount;
    case PeriodUnit.WEEK:
      return Math.ceil(periodUnitCount / 4.345);
    case PeriodUnit.DAY:
      return Math.ceil(periodUnitCount / 30.4167);
    default:
      return 12;
  }
};

interface PDFTemplateFiles {
  html: string;
  css: string;
}

// documents and the related templates
const documentTemplatePaths: TemplatePaths = {
  [DocumentType.DESCRIPTION_OF_WORK_PDF]: {
    html: "/opt/dow-template.html",
    css: "/opt/dow-style.css",
  },
  [DocumentType.DESCRIPTION_OF_WORK_DOCX]: {
    docx: "/opt/dow.docx",
  },
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: {
    excel: "/opt/igce-template.xlsx",
  },
};

export const getPDFDocumentTemplates = (documentType: DocumentType): PDFTemplateFiles => {
  let html = "";
  let css = "";
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_PDF:
      html = fs.readFileSync(documentTemplatePaths[documentType].html, "utf-8");
      css = fs.readFileSync(documentTemplatePaths[documentType].css, "utf-8");
      break;
    default:
      throw new Error(`Unsupported PDF generation type: "${documentType}"`);
  }

  return { html, css };
};

export const getExcelTemplatePath = (documentType: DocumentType): string => {
  let excelPath = "";
  switch (documentType) {
    case DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE:
      excelPath = documentTemplatePaths[documentType].excel;
      break;
    default:
      throw new Error(`Unsupported Excel generation type: "${documentType}"`);
  }

  return excelPath;
};

export const getDocxTemplatePath = (documentType: DocumentType): Buffer => {
  let word;
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_DOCX:
      word = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    default:
      throw new Error(`Unsupported Word generation type: "${documentType}"`);
  }

  return word;
};
