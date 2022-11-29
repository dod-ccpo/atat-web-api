import { ApiBase64SuccessResponse, SuccessStatusCode } from "../../utils/response";
import { GenerateDocumentRequest, RequestEvent } from "../../models/document-generation";
import * as fs from "fs";
import * as path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function generateDow(event: RequestEvent<GenerateDocumentRequest>): Promise<ApiBase64SuccessResponse> {
  // Extract payload
  const payload = event.body.templatePayload;

  // Load the docx file as binary content
  const content = fs.readFileSync(path.resolve(__dirname, "dow.docx"), "binary");
  const zip = new PizZip(content);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  document.render(payload);

  // Create Node JS Buffer to send as response
  const report = document.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
  };
  return new ApiBase64SuccessResponse(report, SuccessStatusCode.OK, headers);
}
