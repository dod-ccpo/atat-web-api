// temporary schema to use for validating /provision-job request
import { ProvisionRequestType } from "../api/client";
import { requestContext } from "../api/provision/start-provisioning-job.test";

// TODO: ensure we have schema validation tests for our shared test objects

export const Clin = {
  type: "object",
  properties: {
    number: { type: "string" },
    popStartDate: { type: "string" },
    popEndDate: { type: "string" },
  },
  required: ["number", "popStartDate", "popEndDate"],
};

export const TaskOrder = {
  type: "object",
  properties: {
    number: { type: "string" },
    clins: {
      type: "array",
      items: {
        ...Clin,
      },
    },
  },
  required: ["number", "clins"],
};

export const Administrator = {
  type: "object",
  properties: {
    email: { type: "string" },
    dodId: { type: "string" },
    needsReset: { type: "boolean", default: false },
  },
  required: ["email", "dodId"],
};

export const AddPortfolioPayload = {
  type: "object",
  properties: {
    name: { type: "string" },
    taskOrders: {
      type: "array",
      items: { ...TaskOrder },
    },
  },
};

export const AddEnvironmentPayload = {
  type: "object",
  properties: {
    name: { type: "string" },
    administrators: {
      type: "array",
      items: {
        type: "object",
        properties: {
          email: { type: "string" },
          dodId: { type: "string" },
          needsReset: { type: "boolean" },
        },
        required: ["email", "dodId"],
      },
    },
  },
};

export const provisionRequestSchema = {
  type: "object",
  properties: {
    jobId: { type: "string" },
    userId: { type: "string" },
    portfolioId: { type: "string" },
    operationType: {
      enum: [
        ProvisionRequestType.ADD_PORTFOLIO,
        ProvisionRequestType.ADD_ENVIRONMENT,
        ProvisionRequestType.ADD_TASK_ORDER,
        ProvisionRequestType.ADD_ADMINISTRATOR,
        ProvisionRequestType.UPDATE_TASK_ORDER,
      ],
    },
    targetCspName: { type: "string" },
    payload: {
      anyOf: [AddPortfolioPayload, AddEnvironmentPayload],
    },
  },
  required: ["userId", "operationType", "targetCspName", "payload"],
  additionalProperties: false,
};

export const provisionRequestEventSchema = {
  type: "object",
  properties: {
    body: provisionRequestSchema,
  },
  additionalProperties: true,
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
    initialSnowRequest: provisionRequestSchema,
  },
  required: ["code", "content"],
  additionalProperties: false,
};
