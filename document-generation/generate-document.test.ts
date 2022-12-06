import fs from "fs";
import { Context } from "aws-lambda";
import { DocumentType } from "../models/document-generation";
import {
  ApiBase64SuccessResponse,
  SuccessBase64Response,
  SuccessStatusCode,
  ValidationErrorResponse,
} from "../utils/response";
import { handler } from "./generate-document";
import { requestContext } from "../api/util/common-test-fixtures";
import {
  sampleDowRequest,
  sampleIfpRequest,
  sampleIgceRequest,
  sampleRequirementsChecklistRequest,
} from "./utils/sampleTestData";

const validRequest = {
  body: JSON.stringify(sampleDowRequest),
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

const docHeaders = {
  igce: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename=IndependentGovernmentCostEstimate.xlsx`,
  },
  ifp: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=IncrementalFundingPlan.docx`,
  },
  requirementsChecklist: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename=RequirementsChecklist.docx`,
  },
};

jest.setTimeout(15000); // default of 5000 was too short
// mocking the functions that generate the documents
jest.mock("./chromium", () => {
  return {
    generateDocument: jest.fn().mockImplementation(() => Buffer.from("generateDocument")),
  };
});
jest.mock("./igce-document", () => {
  return {
    generateIGCEDocument: jest.fn().mockImplementation(() => {
      const buffer = Buffer.from("generateIGCEDocument");
      return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, docHeaders.igce);
    }),
  };
});
jest.mock("./ifp-document", () => {
  return {
    generateIFPDocument: jest.fn().mockImplementation(() => {
      const buffer = Buffer.from("generateIFPDocument");
      return new ApiBase64SuccessResponse(buffer.toString("base64"), SuccessStatusCode.OK, docHeaders.ifp);
    }),
  };
});
jest.mock("./requirements-checklist-document", () => {
  return {
    generateRequirementsChecklistDocument: jest.fn().mockImplementation(() => {
      const buffer = Buffer.from("generateRequirementsChecklistDocument");
      return new ApiBase64SuccessResponse(
        buffer.toString("base64"),
        SuccessStatusCode.OK,
        docHeaders.requirementsChecklist
      );
    }),
  };
});

jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Successful generate-document handler", () => {
  it("should return successful DoW document response", async () => {
    // GIVEN / ARRANGE
    const html = "<H1>ATAT {{to_title}}</H1>";
    const css = `h1 {
      font-size: 1.9rem;
      text-transform: uppercase;
      margin-bottom: 2.4rem !important;
      text-align: center;
      margin-top: 0;
    }`;
    const dowHeaders = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=DescriptionOfWork.pdf`,
    };

    // WHEN / ACT
    mockedFs.readFileSync.mockImplementationOnce(() => html);
    mockedFs.readFileSync.mockImplementationOnce(() => css);
    const response = await handler(validRequest, {} as Context);

    // THEN / ASSERT
    expect(response).toBeInstanceOf(SuccessBase64Response);
    expect(response.headers).toEqual(dowHeaders);
  });
  it("should return successful IGCE document response", async () => {
    // GIVEN / ARRANGE
    const request = {
      ...validRequest,
      body: JSON.stringify(sampleIgceRequest),
    };
    // WHEN / ACT
    const response = await handler(request, {} as Context);

    // THEN / ASSERT
    expect(response).toBeInstanceOf(SuccessBase64Response);
    expect(response.headers).toEqual(docHeaders.igce);
  });
  it("should return successful IFP document response", async () => {
    // GIVEN / ARRANGE
    const request = {
      ...validRequest,
      body: JSON.stringify(sampleIfpRequest),
    };

    // WHEN / ACT
    const response = await handler(request, {} as Context);

    // THEN / ASSERT
    expect(response).toBeInstanceOf(SuccessBase64Response);
    expect(response.headers).toEqual(docHeaders.ifp);
  });
  it("should return successful Requirements Checklist document response", async () => {
    // GIVEN / ARRANGE
    const request = {
      ...validRequest,
      body: JSON.stringify({
        ...sampleRequirementsChecklistRequest,
      }),
    };

    // WHEN / ACT
    const response = await handler(request, {} as Context);
    console.log("RESPONSE: ", JSON.stringify(response));
    // THEN / ASSERT
    expect(response).toBeInstanceOf(SuccessBase64Response);
    expect(response.headers).toEqual(docHeaders.requirementsChecklist);
  });
});

describe("Invalid requests for generate-document handler", () => {
  it.each([
    sampleDowRequest.templatePayload,
    sampleIgceRequest.templatePayload,
    sampleIfpRequest.templatePayload,
    sampleRequirementsChecklistRequest.templatePayload,
  ])("should return validation error when invalid document type", async (payload) => {
    // GIVEN / ARRANGE
    const invalidRequest = {
      ...validRequest,
      body: JSON.stringify({
        documentType: "invalid document",
        templatePayload: payload,
      }),
    };
    // WHEN / ACT
    const response = await handler(invalidRequest, {} as Context);
    const responseBody = JSON.parse(response?.body ?? "");
    // THEN / ASSERT
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.message).toBe("Request failed validation");
  });
  it.each([
    DocumentType.DESCRIPTION_OF_WORK,
    DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE,
    DocumentType.INCREMENTAL_FUNDING_PLAN,
    DocumentType.EVALUATION_PLAN,
    DocumentType.REQUIREMENTS_CHECKLIST,
  ])("should return validation error when payload not an object", async (documentType) => {
    // GIVEN / ARRANGE
    const invalidRequest = {
      ...validRequest,
      body: JSON.stringify({
        documentType,
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
  it.each([
    {
      documentType: DocumentType.DESCRIPTION_OF_WORK,
      templatePayload: { ...sampleDowRequest.templatePayload, another: "prop" },
    },
    {
      documentType: DocumentType.INDEPENDENT_GOVERNMENT_COST_ESTIMATE,
      templatePayload: { ...sampleIgceRequest.templatePayload, additionalProp: "something" },
    },
    {
      documentType: DocumentType.INCREMENTAL_FUNDING_PLAN,
      templatePayload: { ...sampleIfpRequest.templatePayload, unknown: "prop" },
    },
    {
      documentType: DocumentType.REQUIREMENTS_CHECKLIST,
      templatePayload: { ...sampleRequirementsChecklistRequest.templatePayload, special: "prop" },
    },
  ])("should return validation error when payload has additional properties", async (requestBody) => {
    // GIVEN / ARRANGE
    const invalidRequest = {
      ...validRequest,
      body: JSON.stringify(requestBody),
    };
    // WHEN / ACT
    const response = await handler(invalidRequest, {} as Context);
    const responseBody = JSON.parse(response?.body ?? "");
    // THEN / ASSERT
    expect(response).toBeInstanceOf(ValidationErrorResponse);
    expect(responseBody.message).toBe("Request failed validation");
  });
});
