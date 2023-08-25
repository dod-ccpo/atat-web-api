import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import validatorMiddleware from "@middy/validator";
import { logger } from "../utils/logging";
import { tracer } from "../utils/tracing";
import { ApiBase64SuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../utils/response";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";
import { LoggingContextMiddleware } from "../utils/middleware/logging-context-middleware";
import { errorHandlingMiddleware } from "../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import { generateDocument } from "./chromium";
import { generateIGCEDocument } from "./igce-document";
import { generateIFPDocument } from "./ifp-document";
import { generateDowDocument } from "./dow-document";
import { getDocxTemplate, getExcelTemplatePath, getPDFDocumentTemplates } from "./utils/utils";
import {
  DocumentType,
  EvaluationPlan,
  GenerateDocumentRequest,
  generateDocumentSchema,
  IncrementalFundingPlan,
  IndependentGovernmentCostEstimate,
  RequestEvent,
} from "../models/document-generation";
import handlebars from "handlebars";
import juice from "juice";
import { counter, countSections, formatAwardType, formatDuration, formatGroupAndClassification } from "./utils/helpers";
import { RequirementsChecklist } from "../models/document-generation/requirements-checklist";
import { generateRequirementsChecklistDocument } from "./requirements-checklist-document";
import { generateEvalPlanDocument } from "./eval-plan-document";
import { IDescriptionOfWork } from "../models/document-generation/description-of-work";
import { generateJustificationAndApprovalDocument } from "./justification-and-approval-document";
import { generateMarketResearchReportDocument } from "./mrr-document";

import { IJustificationAndApproval } from "../models/document-generation/justification-and-approval";
import { IMarketResearchReport } from "../models/document-generation/market-research-report";
import { IEvaluationMemo } from "../models/document-generation/evaluation-memo";
import { generateEvalMemoDocument } from "./eval-memo-document";
import { transpileSchema } from "@middy/validator/transpile";
import en from "ajv-i18n";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType } = event.body;
  logger.info("Generating document", { documentType });

  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_PDF:
      return generatePdf(event);
    case DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE:
      return generateXlsx(event);
    case DocumentType.DESCRIPTION_OF_WORK_DOCX:
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
    case DocumentType.EVALUATION_PLAN:
    case DocumentType.REQUIREMENTS_CHECKLIST:
    case DocumentType.JUSTIFICATION_AND_APPROVAL:
    case DocumentType.MARKET_RESEARCH_REPORT:
    case DocumentType.EVALUATION_MEMO:
      return generateDocxDocument(event);
    default:
      return new ValidationErrorResponse(`Invalid document type: "${documentType}"`, {
        cause: `Invalid document type "${documentType}" provided. Please provide a valid document  type.`,
      });
  }
}

async function generatePdf(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;
  const { html, css } = getPDFDocumentTemplates(documentType);
  const htmlWithCss = juice.inlineContent(html, css);

  // use handlebars to populate data into template
  const template = handlebars.compile(htmlWithCss);
  const templateWithData = template(templatePayload);

  // use puppeteer to generate pdf
  const pdf = await generateDocument(templateWithData);
  if (!pdf) {
    return INTERNAL_SERVER_ERROR;
  }

  const headers = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.pdf`,
  };

  return new ApiBase64SuccessResponse(pdf.toString("base64"), SuccessStatusCode.OK, headers);
}

async function generateXlsx(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;
  const excelTemplatePath = getExcelTemplatePath(documentType);
  return generateIGCEDocument(excelTemplatePath, templatePayload as IndependentGovernmentCostEstimate);
}

async function generateDocxDocument(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;
  const docxTemplate = getDocxTemplate(documentType);
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK_DOCX:
      return generateDowDocument(docxTemplate, templatePayload as IDescriptionOfWork);
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
      return generateIFPDocument(docxTemplate, templatePayload as IncrementalFundingPlan);
    case DocumentType.EVALUATION_MEMO:
      return generateEvalMemoDocument(docxTemplate, templatePayload as IEvaluationMemo);
    case DocumentType.EVALUATION_PLAN:
      return generateEvalPlanDocument(docxTemplate, templatePayload as EvaluationPlan);
    case DocumentType.REQUIREMENTS_CHECKLIST:
      return generateRequirementsChecklistDocument(docxTemplate, templatePayload as RequirementsChecklist);
    case DocumentType.JUSTIFICATION_AND_APPROVAL:
      return generateJustificationAndApprovalDocument(docxTemplate, templatePayload as IJustificationAndApproval);
    case DocumentType.MARKET_RESEARCH_REPORT:
      return generateMarketResearchReportDocument(docxTemplate, templatePayload as IMarketResearchReport);
    default:
      return new ValidationErrorResponse(`Invalid document type: "${documentType}"`, {
        cause: `Invalid document type "${documentType}" provided. Please provide a valid document type.`,
      });
  }
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(captureLambdaHandler(tracer))
  .use(LoggingContextMiddleware())
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(validatorMiddleware({ eventSchema: transpileSchema(generateDocumentSchema), languages: { en } }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());

// register handlebars helpers for use in template
handlebars.registerHelper("formatDuration", formatDuration);
handlebars.registerHelper("countSections", countSections);
handlebars.registerHelper("counter", counter);
handlebars.registerHelper("formatGroupAndClassification", formatGroupAndClassification);
handlebars.registerHelper("formatAwardType", formatAwardType);
