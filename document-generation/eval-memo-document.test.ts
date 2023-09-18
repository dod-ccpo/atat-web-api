import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleEvalMemoRequestWithException, sampleEvalMemoRequestWithoutException } from "./utils/sampleTestData";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";
import { doGenerate, generateEvalMemoDocument } from "./eval-memo-document";
import { IEvaluationMemo } from "../models/document-generation/evaluation-memo";

describe("Test Eval Memo document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payloadWithException = sampleEvalMemoRequestWithException.templatePayload as IEvaluationMemo;
  const payloadWithoutException = sampleEvalMemoRequestWithoutException.templatePayload as IEvaluationMemo;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.EVALUATION_MEMO);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a Eval Memo w/ exception to fair opportunity without throwing an error", async () => {
    const base64 = await generateEvalMemoDocument(docxTemplate, payloadWithException);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it("can generate a Eval Memo w/o exception to fair opportunity without throwing an error", async () => {
    const base64 = await generateEvalMemoDocument(docxTemplate, payloadWithoutException);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review - w/ exception to fair opportunity", async () => {
    const docBuffer = await doGenerate(docxTemplate, payloadWithException);
    await fs.writeFileSync("evalmemo-withException.docx", docBuffer);
  });

  it("unskip me to generate a local file for manual review - w/o exception to fair opportunity", async () => {
    const docBuffer = await doGenerate(docxTemplate, payloadWithoutException);
    await fs.writeFileSync("evalmemo-withoutException.docx", docBuffer);
  });
});
