import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { logger } from "../utils/logging";
import { tracer } from "../utils/tracing";
import { ApiBase64SuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../utils/response";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";
import { LoggingContextMiddleware } from "../utils/middleware/logging-context-middleware";
import { errorHandlingMiddleware } from "../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import validator from "@middy/validator";
import xssSanitizer from "../utils/middleware/xss-sanitizer";
import { wrapSchema } from "../utils/middleware/schema-wrapper";
import { generateDocument } from "./chromium";
import { generateIGCEDocument } from "./igce-document";
import { generateIFPDocument } from "./ifp-document";
import { getPDFDocumentTemplates, getExcelTemplatePath, getWordTemplate } from "./utils/utils";
import {
  generateDocumentSchema,
  RequestEvent,
  GenerateDocumentRequest,
  DocumentType,
  IndependentGovernmentCostEstimate,
  IncrementalFundingPlan,
  EvaluationPlan,
} from "../models/document-generation";
import handlebars from "handlebars";
import juice from "juice";
import { formatDuration, formatGroupAndClassification, counter, countSections, formatAwardType } from "./utils/helpers";
import { generateEvalPlanDocument } from "./eval-plan-document";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType } = event.body;
  logger.info("Generating document", { documentType });

  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK:
      return generatePdf(event);
    case DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE:
      return generateXlsx(event);
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
    case DocumentType.EVALUATION_PLAN:
      return generateWordDocument(event);
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

async function generateWordDocument(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;
  const wordTemplate = getWordTemplate(documentType);
  switch (documentType) {
    // TODO: Add in DoW docx generation
    // case DocumentType.DESCRIPTION_OF_WORK_DOCX:
    //   return generateIFPDocument(wordTemplate, templatePayload as DescriptionOfWork);
    case DocumentType.INCREMENTAL_FUNDING_PLAN:
      return generateIFPDocument(wordTemplate, templatePayload as IncrementalFundingPlan);
    case DocumentType.EVALUATION_PLAN:
      return generateEvalPlanDocument(wordTemplate, templatePayload as EvaluationPlan);
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
  .use(xssSanitizer())
  .use(validator({ eventSchema: wrapSchema(generateDocumentSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());

// register handlebars helpers for use in template
handlebars.registerHelper("formatDuration", formatDuration);
handlebars.registerHelper("countSections", countSections);
handlebars.registerHelper("counter", counter);
handlebars.registerHelper("formatGroupAndClassification", formatGroupAndClassification);
handlebars.registerHelper("formatAwardType", formatAwardType);
