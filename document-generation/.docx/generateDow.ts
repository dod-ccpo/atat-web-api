import { ApiBase64SuccessResponse, SuccessStatusCode } from "../../utils/response";
import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import * as fs from "fs";
import * as path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { getDocxTemplatePath } from "../utils/utils";

export async function generateDow(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  // Extract payload
  const { documentType, templatePayload } = event.body;

  // Load the docx file as binary content
  const template = getDocxTemplatePath(documentType);

  const zip = new PizZip(template);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  document.render(templatePayload);

  // Create Node JS Buffer to send as response
  const report = Buffer.from(document.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }));

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };
  return new ApiBase64SuccessResponse(report.toString("base64"), SuccessStatusCode.OK, headers);
}
