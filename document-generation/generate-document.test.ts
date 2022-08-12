import fs from "fs";
import { Context } from "aws-lambda";
import { DocumentType } from "../models/document-generation";
import { ErrorStatusCode, OtherErrorResponse, SuccessBase64Response, ValidationErrorResponse } from "../utils/response";
import { handler } from "./generate-document";
import { requestContext } from "../api/util/common-test-fixtures";
import { sampleDowRequest } from "./handlebarUtils/sampleTestData";

const validRequest = {
  body: JSON.stringify(sampleDowRequest),
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

jest.setTimeout(15000); // default of 5000 was too short
jest.mock("./chromium", () => {
  return {
    generateDocument: jest.fn().mockImplementation(() => Buffer.from("generateDocument")),
  };
});
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

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
    mockedFs.readFileSync.mockImplementationOnce(() => html);
    mockedFs.readFileSync.mockImplementationOnce(() => css);
    const response = await handler(validRequest, {} as Context);

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
    const response = await handler(invalidRequest, {} as Context);
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
    const response = await handler(invalidRequest, {} as Context);
    const responseBody = JSON.parse(response?.body ?? "");
    // THEN / ASSERT
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.message).toBe("Request failed validation");
  });
});

describe("Temporary Not Implemented generate-document handler", () => {
  it("should return 501 response", async () => {
    // GIVEN / ARRANGE
    const igceRequest = {
      body: {
        documentType: "INDEPENDENT_GOVERNMENT_COST_ESTIMATE",
        templatePayload: {},
      },
      headers: {
        "Content-Type": "application/json",
      },
      requestContext,
    } as any;

    // WHEN / ACT
    const response = await handler(igceRequest, {} as Context);

    // THEN / ASSERT
    expect(response).toBeInstanceOf(OtherErrorResponse);
    expect(response.statusCode).toBe(ErrorStatusCode.NOT_IMPLEMENTED);
  });
});
