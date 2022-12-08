import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { EvaluationPlan } from "../models/document-generation";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { INTERNAL_SERVER_ERROR } from "../utils/errors";

export async function generateEvalPlanDocument(
  template: Buffer,
  payload: EvaluationPlan
): Promise<ApiBase64SuccessResponse> {
  if (!payload.taskOrderTitle) {
    return INTERNAL_SERVER_ERROR;
  }
  // if its not null (has a method, add a dash)
  let formattedMethod = "";
  if (payload.method) {
    formattedMethod = " — " + payload.method;
  }
  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        formattedMethod,
        formattedSourceSelection: payload.sourceSelection.split("_").join(" "),
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
