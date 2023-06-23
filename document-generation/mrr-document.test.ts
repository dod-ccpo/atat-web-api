import { doGenerate, generateMarketResearchReportDocument } from "./mrr-document";
import { getDocxTemplate } from "./utils/utils";
import { DocumentType } from "../models/document-generation";
import { sampleMarketResearchReportRequest } from "./utils/sampleTestData";
import { IMarketResearchReport } from "../models/document-generation/market-research-report";
import { ApiBase64SuccessResponse } from "../utils/response";
import fs from "fs";

describe("Test MRR document generation", () => {
  const oldEnv = process.env.TEMPLATE_FOLDER;
  const payload = sampleMarketResearchReportRequest.templatePayload as IMarketResearchReport;
  let docxTemplate: Buffer;

  beforeAll(() => {
    process.env.TEMPLATE_FOLDER = "./document-generation/templates";
    docxTemplate = getDocxTemplate(DocumentType.MARKET_RESEARCH_REPORT);
  });
  afterAll(() => {
    process.env.TEMPLATE_FOLDER = oldEnv;
  });

  it("can generate a MRR without throwing an error", async () => {
    const base64 = await generateMarketResearchReportDocument(docxTemplate, payload);
    expect(base64).toBeInstanceOf(ApiBase64SuccessResponse);
  });

  it.skip("unskip me to generate a local MRR file for manual review", async () => {
    const docBuffer = await doGenerate(docxTemplate, payload);
    await fs.writeFileSync("mrr.docx", docBuffer);
  });
});
