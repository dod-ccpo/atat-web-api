/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import xssSanitizer from "../utils/middleware/xss-sanitizer";
import { RequestEvent, GenerateDocumentRequest } from "../models/document-generation";
import exceljs from "exceljs";
import * as fs from "fs";

async function baseHandler(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  const igceInfo = event.body;
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile("/opt/DRAFT JWCC TO IGCE Template 25 April 2022.xlsx");

  // Change C8 cell to "changed"
  const worksheet = workbook.getWorksheet("Base Period");
  const cell = worksheet.getCell("C8");
  console.log(cell.value);
  cell.value = "changed";

  // add row
  const selected_row = worksheet.getRow(7);
  console.log(selected_row);

  selected_row.getCell(1).value = "crab"; // A8's value set to crab, see Base Periods work sheet

  // Creating columns on the worksheet level
  /*
  worksheet.columns = [
    {
      header: "TO CLIN",
      key: "to_clin",
      width: 10,
    },
    {
      header: "CLIN/CLIN Title/Classification Level",
      key: "clin_title",
      width: 10,
    },
    {
      header: "Description of Work",
      key: "dow",
      width: 10,
    },
  ];
*/

  // New page
  const worksheet2 = workbook.addWorksheet("Table Test");
  // make worksheet visible
  worksheet2.state = "visible";
  // add a table to a sheet
  worksheet2.addTable({
    name: "MyTable",
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    columns: [
      { name: "TO CLIN" },
      { name: "CLIN/CLIN Title/Classification Level" },
      { name: "Description of Work Task(s)" },
      { name: "Service Title/Service" },
      { name: "Description of Item/ Configuration Summary" },
      { name: "Monthly" },
      { name: "Months in", totalsRowLabel: "Total Price:" },
      { name: "Total Price for Period: ", totalsRowFunction: "sum" },
    ],
    rows: [["Zachary", "clin title", "dow tasks", "Service", "Item desc", "monthly", "months in", 15]],
  });
  const table = worksheet2.getTable("MyTable");
  table.ref = "D4";
  table.commit();

  table.addRow(["Clark", "clin title", "dow tasks", "Service", "Item desc", "monthly", "months in", 30]);
  table.commit();
  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=out.xlsx`,
  };

  // Return using a buffer, slight performance increase
  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
  return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, headers);

  // Return using writeFile
  /*
  await workbook.xlsx.writeFile("/tmp/out.xlsx");
  const excelFile = fs.readFileSync("/tmp/out.xlsx", "base64");
  return new ApiBase64SuccessResponse(excelFile, SuccessStatusCode.OK, headers);
  */
}

export const handler = middy(baseHandler)
  .use(injectLambdaContext(logger, { clearState: true }))
  .use(LoggingContextMiddleware())
  .use(inputOutputLogger({ logger: (message) => logger.info("Event/Result", message) }))
  .use(errorLogger({ logger: (err) => logger.error("An error occurred during the request", err as Error) }))
  .use(httpJsonBodyParser())
  .use(xssSanitizer())
  .use(errorHandlingMiddleware())
  .use(JSONErrorHandlerMiddleware());
