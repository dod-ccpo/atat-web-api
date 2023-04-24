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

// The UI sets the `optionOrder` for the Base period as `1` and the Option orders follow
// consecutively (e.g, OP1 = 2, OP2 = 3, etc). Given the UI does not allow for an Option
// period to be skipped when creating a Period of Perforamnce (PoP), it is assumed there
// will be no gaps in the PoP option periods (e.g., B, OP1, OP3). As such, the display value
// is generated based on an array of the option periods index rather than the `optionOrder`
// previously used.
export const formatPeriodOfPerformance = (basePeriod: IPeriod, optionPeriods: IPeriod[]): string => {
  const basePluralEnding = basePeriod.periodUnitCount > 1 ? `s` : ``;
  let formattedPop = "";
  formattedPop += capitalize(basePeriod.periodType);
  formattedPop += " period: ";
  formattedPop += basePeriod.periodUnitCount;
  formattedPop += " ";
  formattedPop += `${capitalize(basePeriod.periodUnit)}${basePluralEnding}`;

  const orderedPeriods = [...optionPeriods].sort((a, b) => a.optionOrder - b.optionOrder);
  for (const [index, period] of orderedPeriods.entries()) {
    const optionPluralEnding = period.periodUnitCount > 1 ? `s` : ``;
    // Format the option Period text as "Option period M: N <Days(s) | Month(s) | Year(s)>"
    formattedPop += ", ";
    formattedPop += capitalize(period.periodType);
    formattedPop += " period ";
    formattedPop += index + 1;
    formattedPop += ": ";
    formattedPop += period.periodUnitCount;
    formattedPop += " ";
    formattedPop += `${capitalize(period.periodUnit)}${optionPluralEnding}`;
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

export const formatEnum = (text: string) => {
  return text.split("_").map(capitalize).join(" ");
};

interface PDFTemplateFiles {
  html: string;
  css: string;
}

// documents and the related templates
export const getDocumentTemplatePath = (folder?: string): TemplatePaths => {
  folder = folder || process.env.TEMPLATE_FOLDER || "/opt";
  return {
    [DocumentType.DESCRIPTION_OF_WORK_PDF]: {
      html: `${folder}/dow-template.html`,
      css: `${folder}/dow-style.css`,
    },
    [DocumentType.DESCRIPTION_OF_WORK_DOCX]: {
      docx: `${folder}/dow-template.docx`,
    },
    [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: {
      excel: `${folder}/igce-template.xlsx`,
    },
    [DocumentType.INCREMENTAL_FUNDING_PLAN]: {
      docx: `${folder}/ifp-template.docx`,
    },
    [DocumentType.EVALUATION_PLAN]: {
      docx: `${folder}/eval-plan-template.docx`,
    },
    [DocumentType.REQUIREMENTS_CHECKLIST]: {
      docx: `${folder}/requirements-checklist-template.docx`,
    },
  };
};

export const getPDFDocumentTemplates = (documentType: DocumentType): PDFTemplateFiles => {
  let html = "";
  let css = "";
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_PDF:
      html = fs.readFileSync(getDocumentTemplatePath()[documentType].html, "utf-8");
      css = fs.readFileSync(getDocumentTemplatePath()[documentType].css, "utf-8");
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
      excelPath = getDocumentTemplatePath()[documentType].excel;
      break;
    default:
      throw new Error(`Unsupported Excel generation type: "${documentType}"`);
  }

  return excelPath;
};

export const getDocxTemplate = (documentType: DocumentType): Buffer => {
  const TEMPLATE_FOLDER = process.env.TEMPLATE_FOLDER ?? "/opt";
  let docx;
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_DOCX:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.EVALUATION_PLAN:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.REQUIREMENTS_CHECKLIST:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    default:
      throw new Error(`Unsupported Word generation type: "${documentType}"`);
  }

  return docx;
};
