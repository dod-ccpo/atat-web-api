import { Context } from "aws-lambda";
import { requestContext } from "../api/provision/start-provisioning-job.test";
import { handler } from "./generate-document";
import { sampleDowRequest } from "./handlebarUtils/sampleTestData";
import fs from "fs";
import { SuccessBase64Response, ValidationErrorResponse } from "../utils/response";
import { DocumentType } from "../models/document-generation";

const validRequest = {
  body: JSON.stringify(sampleDowRequest),
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

jest.setTimeout(10000); // default of 5000 was too short
const fnSpy = jest.spyOn(fs, "readFileSync");

describe("Successful generate-document handler", () => {
  it("should return successful response", async () => {
    // GIVEN / ARRANGE
    const html = "<H1>ATAT {{to_title}}</H1>";
    const css = `h1 {
      font-size: 1.9rem;
      text-transform: uppercase;
      margin-bottom: 2.4rem !important;
      text-align: center;
      margin-top: 0;
    }`;

    // WHEN / ACT
    fnSpy.mockImplementationOnce(() => html);
    fnSpy.mockImplementationOnce(() => css);
    const response = await handler(validRequest, {} as Context, () => null);

    // THEN / ASSERT
    expect(response).toBeInstanceOf(SuccessBase64Response);
  });
});

describe("Invalid requests for generate-document handler", () => {
  it("should return validation error when invalid document type", async () => {
    // GIVEN / ARRANGE
    const invalidRequest = {
      ...validRequest,
      body: JSON.stringify({
        documentType: "invalid document",
        templatePayload: sampleDowRequest.templatePayload,
      }),
    };
    // WHEN / ACT
    const response = await handler(invalidRequest, {} as Context, () => null);
    const responseBody = JSON.parse(response?.body ?? "");
    // THEN / ASSERT
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.message).toBe("Request failed validation");
  });
  it("should return validation error when payload not an object", async () => {
    // GIVEN / ARRANGE
    const invalidRequest = {
      ...validRequest,
      body: JSON.stringify({
        documentType: DocumentType.DESCRIPTION_OF_WORK,
        templatePayload: "not an object",
      }),
    };
    // WHEN / ACT
    const response = await handler(invalidRequest, {} as Context, () => null);
    const responseBody = JSON.parse(response?.body ?? "");
    // THEN / ASSERT
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.message).toBe("Request failed validation");
  });
});
