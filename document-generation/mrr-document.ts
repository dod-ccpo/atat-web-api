import { logger } from "../utils/logging";
import { createReport } from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { IMarketResearchReport } from "../models/document-generation/market-research-report";

export async function doGenerate(template: Buffer, payload: IMarketResearchReport): Promise<Buffer> {
  return Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
      },
      cmdDelimiter: ["{", "}"],
    })
  );
}

export async function generateMarketResearchReportDocument(
  template: Buffer,
  payload: IMarketResearchReport
): Promise<ApiBase64SuccessResponse> {
  const report = await doGenerate(template, payload);
  logger.info("MRR document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=MarketResearchReport.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
