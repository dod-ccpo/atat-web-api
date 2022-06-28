import { CspResponse, provisionRequestSchema } from "./provisioning-jobs";
import { CloudServiceProvider } from "./cloud-service-providers";

export type CostResponse = CspResponse;

export interface CostRequest {
  requestId: string;
  portfolioId: string;
  targetCsp: CloudServiceProvider;
  startDate: string;
  endDate: string;
}

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
