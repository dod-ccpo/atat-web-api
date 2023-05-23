import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { IJustificationAndApproval } from "../models/document-generation/justification-and-approval";
import { formatPeriodOfPerformance } from "./utils/utils";

export async function doGenerate(template: Buffer, payload: IJustificationAndApproval): Promise<Buffer> {
  const { periodOfPerformance } = payload;
  const { basePeriod, optionPeriods } = periodOfPerformance;

  return Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        popPeriods: formatPeriodOfPerformance(basePeriod, optionPeriods),
      },
      cmdDelimiter: ["{", "}"],
    })
  );
}

export async function generateJustificationAndApprovalDocument(
  template: Buffer,
  payload: IJustificationAndApproval
): Promise<ApiBase64SuccessResponse> {
  const report = await doGenerate(template, payload);
  logger.info("J&A document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=JustificationAndApproval.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
