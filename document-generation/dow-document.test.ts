/* eslint-disable prettier/prettier */
import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleDowRequest } from "./utils/sampleTestData";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";
import { IDescriptionOfWork } from "../models/document-generation/description-of-work";
import { doGenerate, generateDowDocument } from "./dow-document";

describe("Test DoW document generation", () => {
  jest.setTimeout(15000);
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleDowRequest.templatePayload as IDescriptionOfWork;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.DESCRIPTION_OF_WORK_DOCX);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a DoW without throwing an error", async () => {
    const base64 = await generateDowDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it("can generate a DoW with a null architecturalDesignRequirement without throwing an error", async () => {
    payload.architecturalDesignRequirement = null;
    const base64 = await generateDowDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("dow.docx", docBuffer);
  });
});
