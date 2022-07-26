import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import inputOutputLogger from "@middy/input-output-logger";
import errorLogger from "@middy/error-logger";
import { logger } from "../utils/logging";
import { ApiBase64SuccessResponse, SuccessStatusCode, ValidationErrorResponse } from "../utils/response";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";
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
import exceljs from "exceljs";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const igceInfo = event.body;
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile("/opt/out.xlsx");
  const worksheet = workbook.getWorksheet("Base Period");
  const cell = worksheet.getCell("C8");
  console.log(cell.value);
  cell.value = "changed";
  // await workbook.xlsx.writeFile("out.xlsx");

  const headers = {
    "Content-Type": "application/vnd.ms-excel",
    "Content-Disposition": `attachment; filename=out.xlsx`,
  };
  // get files to generate documents
  // const excelfile = fs.readFileSync("out.xlsx", "utf-8");
  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
  // const fileContent = Buffer.from(buffer);

  // return new ApiBase64SuccessResponse(fileContent.toString("base64"), SuccessStatusCode.OK, headers);
  return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, headers);
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(LoggingContextMiddleware())
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(xssSanitizer())
  //  .use(validator({ eventSchema: wrapSchema(generateDocumentSchema) }))
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
