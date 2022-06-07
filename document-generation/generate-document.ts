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
// import puppeteer from "puppeteer";
import * as puppeteer from "puppeteer-core";
import { PDFOptions } from "puppeteer";
import chromium from "chrome-aws-lambda";
import juice from "juice";

async function baseHandler(
  event: RequestEvent<GenerateDocumentRequest>
): Promise<ApiBase64SuccessResponse<APIGatewayProxyResult>> {
  const lookingAtFiles = fs.readdirSync("/var/task/", { withFileTypes: true });
  // logger.debug not work ?
  console.debug("FILES: " + JSON.stringify(lookingAtFiles));

  // small sample to ensure data populated in template
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
  let browser, pdf;

  try {
    // ! chromium module does not seem to be added, troubleshoot
    console.debug("PUPPET: " + JSON.stringify(chromium.defaultViewport));
    console.debug("PUPPET: " + JSON.stringify(chromium.defaultViewport));
    console.debug("PUPPET: " + JSON.stringify(chromium.executablePath)); // ! empty object
    console.debug("PUPPET: " + JSON.stringify(chromium.headless)); // true
    console.debug("PUPPET: " + JSON.stringify(chromium.puppeteer)); // ! undefined

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    logger.debug("BROWSER: " + JSON.stringify(browser));
    const page = await browser.newPage();
    logger.debug("PAGE: " + JSON.stringify(page));

    const options: any = { format: "A4" }; // PDFOptions still gives typescript error

    await page.setContent(templateWithData);
    await page.emulateMediaType("screen");
    pdf = await page.pdf(options);

    logger.info("Document generation complete");
    logger.debug("PDF: " + pdf);
  } catch (error) {
    logger.error(error as any);
  } finally {
    if (browser !== null) {
      await browser?.close();
    }
  }

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
