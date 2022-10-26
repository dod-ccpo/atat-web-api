import { provisionRequestSchema } from "./provisioning-jobs";
import { CloudServiceProvider } from "./cloud-service-providers";
import { CspResponse } from "../api/util/csp-request";
import { CostResponseByPortfolio } from "../api/client";

export interface CostRequest {
  requestId: string;
  portfolioId: string;
  targetCsp: CloudServiceProvider;
  startDate: string;
  endDate: string;
}

export type CostResponse = CspResponse<CostRequest, CostResponseByPortfolio>;

export enum CspRequest {
  PROVISION = "PROVISION",
  COST = "COST",
}

export type CspRequestType<T> = {
  requestType: CspRequest;
  body: T;
};

export const costRequestSchema = {
  type: "object",
  required: ["requestId", "portfolioId", "targetCsp", "startDate", "endDate"],
  properties: {
    requestId: { type: "string" },
    portfolioId: { type: "string" },
    targetCsp: provisionRequestSchema.properties.targetCsp,
    startDate: { type: "string" },
    endDate: { type: "string" },
  },
};
