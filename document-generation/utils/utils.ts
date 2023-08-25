import {
  DocumentType,
  FundingType,
  IFundingDocument,
  IPeriod,
  PeriodUnit,
  TemplatePaths,
} from "../../models/document-generation";
import * as fs from "fs";
import * as converter from "number-to-words";

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
  let formattedPop = "";
  formattedPop += basePeriod.periodUnitCount;
  formattedPop += "-";
  formattedPop += basePeriod.periodUnit.toLowerCase();
  formattedPop += " base period";
  formattedPop += optionPeriods.length > 0 ? ", plus " : "";

  const extractFromOptionGroup = (group: IPeriod[], prefix: string): string => {
    let section = "";
    // section += formattedPop.includes("option") ? " and " : "";
    section += prefix;
    section += converter.toWords(group.length);
    section += " ";
    section += group[0].periodUnitCount;
    section += "-";
    section += group[0].periodUnit.toLowerCase();
    section += " option period";
    section += group.length > 1 ? "s" : "";
    return section;
  };

  const orderedPeriods: IPeriod[] = [...optionPeriods].sort((a, b) => a.optionOrder - b.optionOrder);
  let previousPeriod!: IPeriod;
  let currentGroup: IPeriod[] = [];
  const allGroups: IPeriod[][] = [];
  for (const period of orderedPeriods) {
    if (
      previousPeriod &&
      (previousPeriod.periodUnit !== period.periodUnit || previousPeriod.periodUnitCount !== period.periodUnitCount)
    ) {
      // If the current period is different from the last one, extract the current group and reset the array
      allGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(period);
    previousPeriod = period;
  }

  // Extract the final remaining group when we're done
  if (currentGroup.length > 0) {
    allGroups.push(currentGroup);
  }

  // Now that we've assembled all the groups, extract the text from them
  for (const [index, group] of allGroups.entries()) {
    if (index === 0) {
      formattedPop += extractFromOptionGroup(group, "");
    } else if (index === allGroups.length - 1) {
      formattedPop += extractFromOptionGroup(group, " and ");
    } else {
      formattedPop += extractFromOptionGroup(group, ", ");
    }
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
    [DocumentType.EVALUATION_MEMO]: {
      docx: `${folder}/eval-memo-template.docx`,
    },
    [DocumentType.EVALUATION_PLAN]: {
      docx: `${folder}/eval-plan-template.docx`,
    },
    [DocumentType.REQUIREMENTS_CHECKLIST]: {
      docx: `${folder}/requirements-checklist-template.docx`,
    },
    [DocumentType.JUSTIFICATION_AND_APPROVAL]: {
      docx: `${folder}/j-and-a-template.docx`,
    },
    [DocumentType.MARKET_RESEARCH_REPORT]: {
      docx: `${folder}/mrr-template.docx`,
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
    case DocumentType.EVALUATION_MEMO:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.EVALUATION_PLAN:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.REQUIREMENTS_CHECKLIST:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.JUSTIFICATION_AND_APPROVAL:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    case DocumentType.MARKET_RESEARCH_REPORT:
      docx = fs.readFileSync(getDocumentTemplatePath()[documentType].docx);
      break;
    default:
      throw new Error(`Unsupported Word generation type: "${documentType}"`);
  }

  return docx;
};
