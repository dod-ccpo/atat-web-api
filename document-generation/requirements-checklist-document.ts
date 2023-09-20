import { logger } from "../utils/logging";
import { createReport } from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { formatPeriodOfPerformance } from "./utils/utils";
import { RequirementsChecklist } from "../models/document-generation/requirements-checklist";
import { REQUEST_BODY_INVALID } from "../utils/errors";

export async function doGenerate(template: Buffer, payload: RequirementsChecklist): Promise<Buffer> {
  const { periodOfPerformance } = payload;
  const { basePeriod, optionPeriods, timeFrame, requestedPopStartDate } = periodOfPerformance;

  return Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        periodOfPerformance: {
          ...periodOfPerformance,
          // restructure time frame (e.g. NO_SOONER_THAN --> no sooner than)
          timeFrame: timeFrame.replaceAll("_", " ").toLowerCase(),
          requestedPopStartDate: new Date(requestedPopStartDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
        popPeriods: formatPeriodOfPerformance(basePeriod, optionPeriods),
      },
      cmdDelimiter: ["{", "}"],
    })
  );
}
export async function generateRequirementsChecklistDocument(
  template: Buffer,
  payload: RequirementsChecklist
): Promise<ApiBase64SuccessResponse> {
  if (!payload || !payload.periodOfPerformance) {
    return REQUEST_BODY_INVALID;
  }
  const report = await doGenerate(template, payload);
  logger.info("Requirements Checklist Word document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=RequirementsChecklist.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
