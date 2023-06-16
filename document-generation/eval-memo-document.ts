import { logger } from "../utils/logging";
import createReport from "docx-templates";
import { ApiBase64SuccessResponse, SuccessStatusCode } from "../utils/response";

export async function doGenerate(template: Buffer, payload: any): Promise<Buffer> {
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

export async function generateEvalMemoDocument(template: Buffer, payload: any): Promise<ApiBase64SuccessResponse> {
  const report = await doGenerate(template, payload);
  logger.info("Eval Memo document generated.");

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=EvalMemo.docx`,
  };

  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
