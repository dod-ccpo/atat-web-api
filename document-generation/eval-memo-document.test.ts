import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleEvalMemo } from "./utils/sampleTestData";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";
import { doGenerate, generateEvalMemoDocument } from "./eval-memo-document";

describe("Test Eval Memo document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleEvalMemo.templatePayload;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.EVALUATION_MEMO);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a J&A without throwing an error", async () => {
    const base64 = await generateEvalMemoDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("evalmemo.docx", docBuffer);
  });
});
