import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { EvaluationPlan } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { getFundingDocInfo } from "./utils/utils";

export async function generateEvalPlanDocument(
  template: Buffer,
  payload: EvaluationPlan
): Promise<ApiBase64SuccessResponse> {
  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
      },
      cmdDelimiter: ["{", "}"],
    })
  );
  logger.info("Evaluation Plan document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=EvaluationPlan.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
