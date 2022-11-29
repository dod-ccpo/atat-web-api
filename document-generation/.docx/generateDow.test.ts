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
import { sampleDowRequest, sampleIgceRequest } from "../utils/sampleTestData";

const validRequest = {
    body: JSON.stringify(sampleDowRequest),
    headers: {
        "Content-Type": "application/json",
    },
    requestContext,
} as any;

// Refer to docs: https://docxtemplater.com/docs/testing/