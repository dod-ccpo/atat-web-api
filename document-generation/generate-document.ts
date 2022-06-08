import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { logger } from "../utils/logging";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { IpCheckerMiddleware } from "../utils/middleware/ip-logging";
import { errorHandlingMiddleware } from "../utils/middleware/error-handling-middleware";
import JSONErrorHandlerMiddleware from "middy-middleware-json-error-handler";
import validator from "@middy/validator";
import { wrapSchema } from "../utils/middleware/schema-wrapper";
import {
  generateDocumentSchema,
  RequestEvent,
  GenerateDocumentRequest,
  DocumentType,
} from "../models/document-generation";
import * as fs from "fs";
import handlebars from "handlebars";
import chromium from "@sparticuz/chrome-aws-lambda";
import juice from "juice";
import { PDFOptions } from "puppeteer-core";

async function baseHandler(
  event: RequestEvent<GenerateDocumentRequest>
): Promise<ApiBase64SuccessResponse<APIGatewayProxyResult>> {
  const { documentType, templatePayload } = event.body;

  // get files to generate documents
  let html, css, htmlWithCss;
  if (documentType === DocumentType.DESCRIPTION_OF_WORK) {
    html = fs.readFileSync("/opt/dow-template.html", "utf-8");
    css = fs.readFileSync("/opt/dow-style.css", "utf-8");
    htmlWithCss = juice.inlineContent(html, css);
  }

  // use handlebars to populate data into template
  const template = handlebars.compile(htmlWithCss);
  const templateWithData = template(templatePayload);

  // use puppeteer to generate pdf
  const pdf = await generateDocument(templateWithData);

  const headers = { "Content-type": "application/pdf" };
  return new ApiBase64SuccessResponse<string | undefined>(pdf?.toString("base64"), SuccessStatusCode.OK, headers);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger))
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(validator({ eventSchema: wrapSchema(generateDocumentSchema) }));
// TODO: fix middleware inputs/outputs
// .use(IpCheckerMiddleware())
// .use(errorHandlingMiddleware);

async function generateDocument(templateWithData: string): Promise<Buffer | undefined> {
  let browser, generatedDocument;
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    const options: PDFOptions = { format: "A4" };

    await page.setContent(templateWithData);
    await page.emulateMediaType("screen");
    generatedDocument = await page.pdf(options);

    logger.info("Document generation complete");
  } catch (error) {
    logger.error(error as any);
  } finally {
    if (browser !== null) {
      await browser?.close();
    }
  }

  return generatedDocument;
}
