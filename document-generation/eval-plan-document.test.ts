import { EvaluationPlan } from "../models/document-generation";
import { sampleEvalPlanRequest } from "./utils/sampleTestData";
import * as fs from "fs";
import * as path from "path";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";
import { generateEvalPlanDocument } from "./eval-plan-document";

describe("Generate an Evaluation Plan document - success path", () => {
  const sampleEPRequest = sampleEvalPlanRequest.templatePayload as EvaluationPlan;
  const sampleEPCustomSpecsRequest = sampleEvalPlanRequest.templatePayload as EvaluationPlan;

  it.each([sampleEPRequest, sampleEPCustomSpecsRequest])("should return an ApiBase64Response", async (epPayload) => {
    // GIVEN
    const templateBuffer = fs.readFileSync(path.resolve(__dirname, "templates/eval-plan-template.docx"));
    const headers = {
      "Content-Disposition": "attachment; filename=EvaluationPlan.docx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    // WHEN
    const response = await generateEvalPlanDocument(templateBuffer, epPayload);

    // THEN
    expect(response.headers).toEqual(headers);
    expect(response).toBeInstanceOf(ApiBase64SuccessResponse);
  });
});

describe("Generate an Evaluation Plan document - failure path", () => {
  it("should return an error if empty argument", async () => {
    // WHEN
    const emptyArgument = Buffer;
    const response = await generateEvalPlanDocument(emptyArgument as any, {} as EvaluationPlan);
    // THEN
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
