/* eslint-disable prettier/prettier */
import { EvaluationPlan, DocumentType } from "../models/document-generation";
import { sampleEvalPlanRequest } from "./utils/sampleTestData";
import { getDocxTemplate } from "./utils/utils";
import * as fs from "fs";
import * as path from "path";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";
import { generateEvalPlanDocument, doGenerate } from "./eval-plan-document";

describe("Test DoW document generation", () => {
  jest.setTimeout(15000);
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleEvalPlanRequest.templatePayload as EvaluationPlan;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.EVALUATION_PLAN);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate an Eval Plan without throwing an error", async () => {
    const base64 = await generateEvalPlanDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });


  it.skip("unskip me to generate a local file for manual review", async () => {
    // payload.architecturalDesignRequirement = null;
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("eval-plan-test.docx", docBuffer);
  });

  const templateBuffer = fs.readFileSync(path.resolve(__dirname, "templates/eval-plan-template.docx"));
  it("should return an error if empty argument", async () => {
    // WHEN
    const response = await generateEvalPlanDocument(templateBuffer, {} as EvaluationPlan);
    // THEN
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });

});

