import { CspResponse } from "./provisioning-jobs";

export type CostResponse = CspResponse;

export interface CostRequest {
  requestId: string;
  portfolioId: string;
  startDate: string;
  endDate: string;
}

export const costRequestSchema = {
  type: "object",
  required: ["requestId", "portfolioId", "startDate", "endDate"],
  properties: {
    requestId: { type: "string" },
    portfolioId: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
  },
};
