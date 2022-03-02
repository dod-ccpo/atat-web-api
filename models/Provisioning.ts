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

export interface ProvisionPayloads {
  payload: NewPortfolioPayload | FundingSourcePayload | OperatorPayload;
}

export interface ProvisionRequest {
  jobId: string;
  userId: string;
  portfolioId: string;
  operationType: ProvisionRequestType;
  // could not use the CloudServiceProviders static properties so used strings
  targetCsp: "CSP_A" | "CSP_B" | "CSP_C" | "CSP_D";
  targetNetwork: Network;
  payload: ProvisionPayloads;
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
      enum: [
        CloudServiceProvider.CSP_A.name,
        CloudServiceProvider.CSP_B.name,
        CloudServiceProvider.CSP_C.name,
        CloudServiceProvider.CSP_D.name,
      ],
    },
    targetNetwork: {
      enum: [Network.NETWORK_1, Network.NETWORK_2, Network.NETWORK_3],
    },
    payload: {
      type: "object",
    },
  },
};
