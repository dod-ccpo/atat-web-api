import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleEvalMemoRequest } from "./utils/sampleTestData";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";
import { doGenerate, generateEvalMemoDocument } from "./eval-memo-document";
import { IEvaluationMemo } from "../models/document-generation/evaluation-memo";

describe("Test Eval Memo document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleEvalMemoRequest.templatePayload as IEvaluationMemo;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.EVALUATION_MEMO);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a Eval Memo without throwing an error", async () => {
    const base64 = await generateEvalMemoDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("evalmemo.docx", docBuffer);
  });
});
