import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";
import { capitalize, formatPeriodOfPerformance } from "./utils/utils";
import { RequirementsChecklist } from "../models/document-generation/requirements-checklist";
import { REQUEST_BODY_INVALID } from "../utils/errors";

export async function generateRequirementsChecklistDocument(
  template: Buffer,
  payload: RequirementsChecklist
): Promise<ApiBase64SuccessResponse> {
  if (!payload || !payload.periodOfPerformance) {
    return REQUEST_BODY_INVALID;
  }
  const { periodOfPerformance } = payload;
  const { basePeriod, optionPeriods, timeFrame, requestedPopStartDate } = periodOfPerformance;

  const report = Buffer.from(
    await createReport({
      template,
      data: {
        ...payload,
        periodOfPerformance: {
          ...periodOfPerformance,
          // restructure time frame (e.g. NO_SOONER_THAN --> No Sooner Than)
          timeFrame: timeFrame.split("_").map(capitalize).join(" "),
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
  logger.info("Requirements Checklist Word document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=RequirementsChecklist.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
