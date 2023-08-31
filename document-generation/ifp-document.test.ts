import { DocumentType, IncrementalFundingPlan, IndependentGovernmentCostEstimate } from "../models/document-generation";
import { generateIGCEDocument } from "./igce-document";
import { fundingDocumentWithMiprNumber, sampleIfpRequest } from "./utils/sampleTestData";
import * as fs from "fs";
import * as path from "path";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";
import { doGenerate, generateIFPDocument } from "./ifp-document";
import { getDocxTemplate } from "./utils/utils";

describe("Generate an IFP binary document - happy path", () => {
  const sampleIfpRequestWithOrderNumber = sampleIfpRequest.templatePayload as IncrementalFundingPlan;
  const sampleIfpRequestWithMIPRNumber = {
    ...sampleIfpRequest.templatePayload,
    fundingDocument: fundingDocumentWithMiprNumber,
  } as IncrementalFundingPlan;
  const sampleIfpRequestWithNoType = {
    ...sampleIfpRequest.templatePayload,
    fundingDocument: {
      fundingType: "UNKNOWN_TYPE" as any,
    },
  } as IncrementalFundingPlan;

  it.each([sampleIfpRequestWithOrderNumber, sampleIfpRequestWithMIPRNumber, sampleIfpRequestWithNoType])(
    "should return an ApiBase64Response",
    async (ifpPayload) => {
      // GIVEN
      const templateBuffer = fs.readFileSync(path.resolve(__dirname, "templates/ifp-template.docx"));
      const headers = {
        "Content-Disposition": "attachment; filename=IncrementalFundingPlan.docx",
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      // WHEN
      const response = await generateIFPDocument(templateBuffer, ifpPayload);

      // THEN
      expect(response.headers).toEqual(headers);
      expect(response).toBeInstanceOf(ApiBase64SuccessResponse);
    }
  );
});

describe("Generate an IFP binary document - sad path", () => {
  it("should return an error if empty argument", async () => {
    // WHEN
    const response = await generateIGCEDocument("", {} as IndependentGovernmentCostEstimate);
    // THEN
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});

describe("Test IFP document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleIfpRequest.templatePayload;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.INCREMENTAL_FUNDING_PLAN);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate an IFP without throwing an error", async () => {
    const base64 = await generateIFPDocument(docxTemplate, payload as any);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload as any);
    await fs.writeFileSync("ifp.docx", docBuffer);
  });
});
