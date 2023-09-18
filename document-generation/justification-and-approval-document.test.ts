import { doGenerate, generateJustificationAndApprovalDocument } from "./justification-and-approval-document";
import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleJustificationAndApprovalRequest } from "./utils/sampleTestData";
import { IJustificationAndApproval } from "../models/document-generation/justification-and-approval";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";

describe("Test J&A document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleJustificationAndApprovalRequest.templatePayload as IJustificationAndApproval;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.JUSTIFICATION_AND_APPROVAL);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a J&A without throwing an error", async () => {
    const base64 = await generateJustificationAndApprovalDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("janda.docx", docBuffer);
  });
});
