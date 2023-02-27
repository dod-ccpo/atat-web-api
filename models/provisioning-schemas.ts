// temporary schema to use for validating /provision-job request
import { ProvisionRequestType } from "./provisioning-jobs";

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
    // clins: {
    //   type: "array",
    //   items: { Clin },
    // },
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
    // taskOrders: {
    //   type: "array",
    //   items: { $ref: TaskOrder },
    // },
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
    // operationType: (function () {
    //   return Object.values(ProvisionRequestType);
    // })(),
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
      // type: "object",
      // properties: {
      //   name: { type: "string" },
      //   fundingSources: {
      //     type: "array",
      //     items: {
      //       type: "object",
      //       properties: {
      //         taskOrderNumber: { type: "string" },
      //         clin: { type: "string" },
      //         popStartDate: { type: "string" },
      //         popEndDate: { type: "string" },
      //       },
      //       required: ["taskOrderNumber", "clin", "popStartDate", "popEndDate"],
      //     },
      //   },
      //   administrators: {
      //     type: "array",
      //     items: {
      //       type: "object",
      //       required: ["email", "dodId"],
      //       properties: {
      //         email: { type: "string" },
      //         dodId: { type: "string" },
      //         needsReset: { type: "boolean", default: false },
      //       },
      //     },
      //   },
      // },
      // additionalProperties: false,
      // minProperties: 1,
    },
  },
  required: ["userId", "operationType", "targetCspName", "payload"],
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
    initialSnowRequest: provisionRequestSchema,
  },
  required: ["code", "content"],
  additionalProperties: false,
};
