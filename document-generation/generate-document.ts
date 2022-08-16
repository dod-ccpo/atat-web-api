import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { logger } from "../utils/logging";
import { tracer } from "../utils/tracing";
import {
  ApiBase64SuccessResponse,
  OtherErrorResponse,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../utils/response";
import { INTERNAL_SERVER_ERROR, NOT_IMPLEMENTED } from "../utils/errors";
import { LoggingContextMiddleware } from "../utils/middleware/logging-context-middleware";
import { errorHandlingMiddleware } from "../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import validator from "@middy/validator";
import xssSanitizer from "../utils/middleware/xss-sanitizer";
import { wrapSchema } from "../utils/middleware/schema-wrapper";
import { generateDocument } from "./chromium";
import {
  generateDocumentSchema,
  RequestEvent,
  GenerateDocumentRequest,
  DocumentType,
  TemplatePaths,
  IndependentGovernmentCostEstimate,
} from "../models/document-generation";
import * as fs from "fs";
import handlebars from "handlebars";
import juice from "juice";
import { formatDuration, formatGroupAndClassification, counter, countSections, formatAwardType } from "./utils/helpers";
import { generateIGCEDocument } from "./igce-document";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType } = event.body;
  switch (documentType) {
    case DocumentType.DESCRIPTION_OF_WORK:
      return generatePdf(event);
    case DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE:
      return generateXlsx();
    default:
      return new ValidationErrorResponse(`Invalid document type: "${documentType}"`, {
        cause: `Invalid document type "${documentType}" provided. Please provide a valid document  type.`,
      });
  }
}

async function generatePdf(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;
  logger.info("Generating document", { documentType });
  let response = new ApiBase64SuccessResponse("", SuccessStatusCode.OK, {});

  const documentTemplatePaths: TemplatePaths = {
    [DocumentType.DESCRIPTION_OF_WORK]: {
      html: "/opt/dow-template.html",
      css: "/opt/dow-style.css",
    },
    [DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE]: {
      excel: "/opt/igce-template.xlsx",
    },
  };

  if (documentType === DocumentType.DESCRIPTION_OF_WORK) {
    // get files to generate documents
    const html = fs.readFileSync(documentTemplatePaths[documentType].html, "utf-8");
    const css = fs.readFileSync(documentTemplatePaths[documentType].css, "utf-8");
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
    response = new ApiBase64SuccessResponse(pdf.toString("base64"), SuccessStatusCode.OK, headers);
  }

  if (documentType === DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE) {
    const excelTemplatePath = documentTemplatePaths[documentType].excel;
    const igce = await generateIGCEDocument(excelTemplatePath, templatePayload as IndependentGovernmentCostEstimate);
    response = new ApiBase64SuccessResponse(igce.buffer.toString("base64"), SuccessStatusCode.OK, igce.headers);
  }

  return response;
}

async function generateXlsx(): Promise<OtherErrorResponse> {
  return NOT_IMPLEMENTED;
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
