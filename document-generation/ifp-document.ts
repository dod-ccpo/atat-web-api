import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { IncrementalFundingPlan } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { getFundingDocInfo } from "./utils/utils";
import { REQUEST_BODY_INVALID } from "../utils/errors";

export async function doGenerate(template: Buffer, payload: IncrementalFundingPlan): Promise<Buffer> {
  return Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        // update amounts to have commas
        estimatedTaskOrderValue: payload.estimatedTaskOrderValue.toLocaleString("en-US"),
        initialAmount: payload.initialAmount.toLocaleString("en-US"),
        remainingAmount: payload.remainingAmount.toLocaleString("en-US"),
        // construct Funding Document information to be used in template
        fundingDocInfo: getFundingDocInfo(payload.fundingDocument),
      },
      cmdDelimiter: ["{", "}"],
    })
  );
}
export async function generateIFPDocument(
  template: Buffer,
  payload: IncrementalFundingPlan
): Promise<ApiBase64SuccessResponse> {
  if (!payload || !payload.fundingDocument) {
    return REQUEST_BODY_INVALID;
  }
  const report = await doGenerate(template, payload);
  logger.info("IFP Word document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=IncrementalFundingPlan.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
