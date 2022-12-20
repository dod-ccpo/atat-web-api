import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { DescriptionOfWork } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { getWordTemplate } from "./utils/utils";

export async function generateIFPDocument(
  template: Buffer,
  payload: DescriptionOfWork
): Promise<ApiBase64SuccessResponse> {
  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        // update amounts to have commas
        // TODO see if there is anything we need to manipulate, if so do that here
        // estimatedTaskOrderValue: payload.estimatedTaskOrderValue.toLocaleString("en-US"),
        // initialAmount: payload.initialAmount.toLocaleString("en-US"),
        // remainingAmount: payload.remainingAmount.toLocaleString("en-US"),
        
        // construct Funding Document information to be used in template
        //Additional data needed to pull in to complete the document
        //fundingDocInfo: getWordTemplate(payload.),
        
      },
      cmdDelimiter: ["{", "}"],
    })
  );
  logger.info("DOW Word document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
