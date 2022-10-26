import { CloudServiceProvider } from "./cloud-service-providers";
import { CspResponse } from "../api/util/csp-request";
import {
  AddPortfolioResponseSync,
  AddPortfolioResponseAsync,
  GetProvisioningStatusResponse,
  AddPortfolioRequest,
  GetProvisioningStatusRequest,
} from "../api/client";

export enum ProvisionRequestType {
  ADD_PORTFOLIO = "ADD_PORTFOLIO",
  ADD_OPERATORS = "ADD_OPERATORS",
  ADD_FUNDING_SOURCE = "ADD_FUNDING_SOURCE",
}

export interface FundingSource {
  taskOrderNumber: string;
  clin: string;
  popStartDate: string;
  popEndDate: string;
}

export interface Operator {
  email: string;
  dodId: string;
  needsReset: boolean;
}

export interface NewPortfolioPayload {
  name: string;
  fundingSources: Array<FundingSource>;
  operators: Array<Operator>;
}

export interface FundingSourcePayload {
  fundingSources: Array<FundingSource>;
}

export interface OperatorPayload {
  operators: Array<Operator>;
}

export type ProvisionCspResponse =
  | CspResponse<AddPortfolioRequest, AddPortfolioResponseSync>
  | CspResponse<AddPortfolioRequest, AddPortfolioResponseAsync | { details: string }>
  | CspResponse<GetProvisioningStatusRequest, GetProvisioningStatusResponse>;

export interface ProvisionRequest {
  jobId: string;
  userId: string;
  portfolioId?: string;
  operationType: ProvisionRequestType;
  targetCsp: CloudServiceProvider;
  payload: NewPortfolioPayload | FundingSourcePayload | OperatorPayload;
}

export interface AsyncProvisionRequest extends ProvisionRequest {
  location: string;
}

// temporary schema to use for validating /provision-job request
export const provisionRequestSchema = {
  type: "object",
  properties: {
    jobId: { type: "string" },
    userId: { type: "string" },
    portfolioId: { type: "string" },
    operationType: {
      enum: [
        ProvisionRequestType.ADD_FUNDING_SOURCE,
        ProvisionRequestType.ADD_PORTFOLIO,
        ProvisionRequestType.ADD_OPERATORS,
      ],
    },
    targetCsp: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        uri: { type: "string", deprecated: true },
        network: { type: "string", deprecated: true },
      },
    },
    payload: {
      type: "object",
      properties: {
        name: { type: "string" },
        fundingSources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              taskOrderNumber: { type: "string" },
              clin: { type: "string" },
              popStartDate: { type: "string" },
              popEndDate: { type: "string" },
            },
            required: ["taskOrderNumber", "clin", "popStartDate", "popEndDate"],
          },
        },
        operators: {
          type: "array",
          items: {
            type: "object",
            required: ["email", "dodId"],
            properties: {
              email: { type: "string" },
              dodId: { type: "string" },
              needsReset: { type: "boolean", default: false },
            },
          },
        },
      },
      additionalProperties: false,
      minProperties: 1,
    },
  },
  required: ["jobId", "userId", "operationType", "targetCsp", "payload"],
  additionalProperties: false,
};

export const provisionResponseSchema = {
  type: "object",
  properties: {
    code: {
      type: "number",
    },
    content: {
      type: "object",
      properties: {
        request: { type: "object" },
        response: { type: "object" },
      },
      required: ["request", "response"],
    },
  },
  required: ["code", "content"],
  additionalProperties: false,
};
