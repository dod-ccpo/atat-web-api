import * as fs from "fs";
import * as path from "path";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";
import { RequirementsChecklist } from "../models/document-generation/requirements-checklist";
import { generateRequirementsChecklistDocument } from "./requirements-checklist-document";
import { sampleRequirementsChecklistRequest } from "./utils/sampleTestData";

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
