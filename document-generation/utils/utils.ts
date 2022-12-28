import {
  PeriodUnit,
  IPeriod,
  DocumentType,
  TemplatePaths,
  IFundingDocument,
  FundingType,
} from "../../models/document-generation";
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

export const formatPeriodOfPerformance = (basePeriod: IPeriod, optionPeriods: IPeriod[]): string => {
  let formattedPop = "";
  formattedPop += capitalize(basePeriod.periodType);
  formattedPop += " period: ";
  formattedPop += basePeriod.periodUnitCount;
  formattedPop += " ";
  formattedPop += `${capitalize(basePeriod.periodUnit)}(s)`;

  const orderedPeriods = [...optionPeriods].sort((a, b) => a.optionOrder - b.optionOrder);
  for (const period of orderedPeriods) {
    // Format the option Period text as "Option period M: N <Days(s) | Month(s) | Year(s)>"
    formattedPop += ", ";
    formattedPop += capitalize(period.periodType);
    formattedPop += " period ";
    formattedPop += period.optionOrder;
    formattedPop += ": ";
    formattedPop += period.periodUnitCount;
    formattedPop += " ";
    formattedPop += `${capitalize(period.periodUnit)}(s)`;
  }
  return formattedPop;
};

export const getFundingDocInfo = (fundingDoc: IFundingDocument): string => {
  const documentTypes = [FundingType.MIPR, FundingType.FS_FORM];
  if (!fundingDoc || !documentTypes.includes(fundingDoc.fundingType)) {
    return "";
  }

  if (fundingDoc.fundingType === FundingType.MIPR) {
    return `MIPR #: ${fundingDoc.miprNumber}`;
  }
  return `Order #: ${fundingDoc.orderNumber}`;
};

interface PDFTemplateFiles {
  html: string;
  css: string;
}

// documents and the related templates
const documentTemplatePaths: TemplatePaths = {
  [DocumentType.DESCRIPTION_OF_WORK]: {
    html: "/opt/dow-template.html",
    css: "/opt/dow-style.css",
  },
  [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: {
    excel: "/opt/igce-template.xlsx",
  },
  [DocumentType.INCREMENTAL_FUNDING_PLAN]: {
    docx: "/opt/ifp-template.docx",
  },
  [DocumentType.EVALUATION_PLAN]: {
    docx: "/opt/eval-plan-template.docx",
  },
  [DocumentType.REQUIREMENTS_CHECKLIST]: {
    docx: "/opt/requirements-checklist-template.docx",
  },
};

export const getPDFDocumentTemplates = (documentType: DocumentType): PDFTemplateFiles => {
  let html = "";
  let css = "";
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK:
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

export const getDocxTemplate = (documentType: DocumentType): Buffer => {
  let docx;
  switch (documentType) {
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    case DocumentType.EVALUATION_PLAN:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    case DocumentType.REQUIREMENTS_CHECKLIST:
      docx = fs.readFileSync(documentTemplatePaths[documentType].docx);
      break;
    default:
      throw new Error(`Unsupported Word generation type: "${documentType}"`);
  }

  return docx;
};
