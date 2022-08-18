import { IndependentGovernmentCostEstimate } from "../models/document-generation";
import { generateIGCEDocument } from "./igce-document";
import { sampleIgceRequest } from "./utils/sampleTestData";
import * as fs from "fs";
import { ApiBase64SuccessResponse, ErrorStatusCode, OtherErrorResponse } from "../utils/response";

beforeEach(() => {
  jest.resetAllMocks();
});

describe("Generate an IGCE binary document - happy path", () => {
  it("should return an ApiBase64Resposne ", async () => {
    // GIVEN
    const filepath = fs.realpathSync("./document-generation/templates/igce-template.xlsx");
    const payload = sampleIgceRequest.templatePayload as IndependentGovernmentCostEstimate;
    const headers = {
      "Content-Disposition": "attachment; filename=IndependentGovernmentCostEstimate.xlsx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    // WHEN
    const response = await generateIGCEDocument(filepath, payload);

    // THEN
    expect(response.headers).toEqual(headers);
    expect(response).toBeInstanceOf(ApiBase64SuccessResponse);
  });
});

describe("Generate an IGCE binary document - sad path", () => {
  it("should return an error if empty argument passed in", async () => {
    // GIVEN
    // WHEN
    const response = await generateIGCEDocument("", {} as IndependentGovernmentCostEstimate);
    // THEN
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.INTERNAL_SERVER_ERROR);
  });
});
