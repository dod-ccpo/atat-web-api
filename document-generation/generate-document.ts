import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { logger } from "../utils/logging";
import { ApiBase64SuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../utils/response";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";
import { IpCheckerMiddleware } from "../utils/middleware/ip-logging";
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
} from "../models/document-generation";
import * as fs from "fs";
import handlebars from "handlebars";
import juice from "juice";
import {
  formatDuration,
  formatGroupAndClassification,
  counter,
  countSections,
  formatAwardType,
} from "./handlebarUtils/helpers";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const { documentType, templatePayload } = event.body;

  const documentTemplatePaths = {
    [DocumentType.DESCRIPTION_OF_WORK as string]: {
      html: "/opt/dow-template.html",
      css: "/opt/dow-style.css",
    },
  };
  if (!(documentType in documentTemplatePaths)) {
    return new ValidationErrorResponse(`Invalid document type: "${documentType}"`, {
      cause: `Invalid document type "${documentType}" provided. Please provide a valid document  type.`,
    });
  }

  // get files to generate documents
  const html = fs.readFileSync(documentTemplatePaths[documentType].html, "utf-8");
  const css = fs.readFileSync(documentTemplatePaths[documentType].html, "utf-8");
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

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(IpCheckerMiddleware())
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
