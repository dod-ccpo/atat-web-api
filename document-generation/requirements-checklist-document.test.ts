import * as fs from "fs";
import * as path from "path";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";
import { RequirementsChecklist } from "../models/document-generation/requirements-checklist";
import { doGenerate, generateRequirementsChecklistDocument } from "./requirements-checklist-document";
import { sampleRequirementsChecklistRequest } from "./utils/sampleTestData";
import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";

describe("Generate an Requirements Checklist binary document - happy path", () => {
  const requirementsChecklistRequest =
    sampleRequirementsChecklistRequest.templatePayload as unknown as RequirementsChecklist;
  it.each([requirementsChecklistRequest])("should return an ApiBase64Response", async (requirementsChecklist) => {
    // GIVEN
    const templateBuffer = fs.readFileSync(path.resolve(__dirname, "templates/requirements-checklist-template.docx"));
    const headers = {
      "Content-Disposition": "attachment; filename=RequirementsChecklist.docx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    // WHEN
    const response = await generateRequirementsChecklistDocument(templateBuffer, requirementsChecklist);

    // THEN
    expect(response.headers).toEqual(headers);
    expect(response).toBeInstanceOf(ApiBase64SuccessResponse);
  });
});

describe("Generate an Requirements Checklist binary document - sad path", () => {
  it.each([undefined, null, {}, ""])("should return an error if invalid payload", async (payload) => {
    // WHEN
    const response = await generateRequirementsChecklistDocument(
      Buffer.from(""),
      payload as unknown as RequirementsChecklist
    );
    // THEN
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.BAD_REQUEST);
  });
});

describe("Test Requirements Checklist document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  // TODO: our sample doesn't actually conform to the types so we should fix this. In the meantime, we're using any.
  const payload = sampleRequirementsChecklistRequest.templatePayload;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.REQUIREMENTS_CHECKLIST);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a Requirements Checklist without throwing an error", async () => {
    const base64 = await generateRequirementsChecklistDocument(docxTemplate, payload as any);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload as any);
    await fs.writeFileSync("reqchecklist.docx", docBuffer);
  });
});
