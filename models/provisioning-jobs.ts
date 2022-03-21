import { HttpMethod } from "../lib/http";
import { APIGatewayEventRequestContext } from "aws-lambda";
import { CloudServiceProvider, Network } from "./cloud-service-providers";

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

export interface NewPortfolioPayload {
  name: string;
  fundingSources: Array<FundingSource>;
  operators: Array<string>;
}

export interface FundingSourcePayload {
  fundingSources: Array<FundingSource>;
}

export interface OperatorPayload {
  operators: Array<string>;
}

export interface CspResponse {
  code: number;
  content: object;
}

export interface CspInvocation {
  method: HttpMethod;
  headers: Record<string, string>;
  endpoint: string;
  payload: NewPortfolioPayload | FundingSourcePayload | OperatorPayload;
}

export interface ProvisionRequest {
  jobId: string;
  userId: string;
  portfolioId: string;
  operationType: ProvisionRequestType;
  targetCsp: CloudServiceProvider;
  payload: NewPortfolioPayload | FundingSourcePayload | OperatorPayload;
  cspInvocation: CspInvocation | undefined;
  cspResponse: CspResponse | undefined;
}

export interface StepFunctionRequestEvent<T> {
  body: T;
  requestContext: APIGatewayEventRequestContext;
}
export type RequestBodyType = ProvisionRequest;

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
      required: ["name", "uri", "network"],
      properties: {
        name: { type: "string" },
        uri: { type: "string" },
        network: { enum: [Network.NETWORK_1, Network.NETWORK_2, Network.NETWORK_3] },
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
        operators: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
      minProperties: 1,
    },
    cspInvocation: {
      type: "object",
      properties: {
        method: { enum: [HttpMethod.PATCH, HttpMethod.POST, HttpMethod.GET] },
        headers: {
          type: "object",
        },
        endpoint: { type: "string" },
        payload: {
          type: "object",
        },
      },
    },
    cspResponse: {
      type: "object",
      properties: {
        code: {
          type: "number",
        },
        content: {
          type: "object",
        },
      },
    },
  },
  required: ["jobId", "userId", "portfolioId", "operationType", "targetCsp", "payload"],
  additionalProperties: false,
};
