import fs from "fs";
import { Context } from "aws-lambda";
import { DocumentType } from "../../models/document-generation";
import {
    ApiBase64SuccessResponse,
    SuccessBase64Response,
    SuccessStatusCode,
    ValidationErrorResponse,
} from "../../utils/response";
import { handler } from "../generate-document";
import { requestContext } from "../../api/util/common-test-fixtures";
import { sampleDowDocxRequest, sampleIgceRequest } from "../utils/sampleTestData";
import { generateDow } from "./generateDow";

const validRequest = {
    body: JSON.stringify(sampleDowDocxRequest),
    headers: {
        "Content-Type": "application/json",
    },
    requestContext,
} as any;

const dowHeaders = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=DescriptionOfWork.docx`,
};


// Refer to docs: https://docxtemplater.com/docs/testing/
describe("Generate a DOW without errors", () => {
    it("should return successful DoW document response", async () => {

        const response = await generateDow(validRequest);

        // THEN / ASSERT
        expect(response).toBeInstanceOf(SuccessBase64Response);
        expect(response.headers).toEqual(dowHeaders);
    });
});