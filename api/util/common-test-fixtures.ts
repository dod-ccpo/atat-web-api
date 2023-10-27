import { SQSEvent } from "aws-lambda";
import { CostRequest } from "../../models/cost-jobs";
import * as crypto from "crypto";
import {
  ClassificationLevel,
  ClinType,
  CostResponseByPortfolio,
  HothProvisionRequest,
  ProvisionRequestType,
} from "../client";

// Mock data used by unit and integration tests
export const TEST_PORTFOLIO_ID = "b02e77d1-234d-4e3d-bc85-b57ca5a93952";
export const TEST_BAD_PORTFOLIO_ID = "00000000-0000-0000-0000-000000000000";
export const TEST_ENVIRONMENT_ID = "1a302680-6127-4bc1-be43-735703bdecb1";
export const TEST_PROVISIONING_JOB_ID = "81b31a89-e3e5-46ee-acfe-75436bd14577";
export const TEST_TASKORDER_ID = "csp-a-task-order-id-123";
export const CSP_A_TEST_ENDPOINT = "https://CSP_A.example.com";
export const CSP_B_TEST_ENDPOINT = "https://CSP_B.example.com";
export const CSP_B_STATUS_ENDPOINT = `${CSP_B_TEST_ENDPOINT}/provisioning/${TEST_PROVISIONING_JOB_ID}/status`;
export const CSP_A = "CSP_A";
export const CSP_B = "CSP_B";

// provisioning fixtures
export const taskOrders = [
  {
    taskOrderNumber: "1234567890123",
    popStartDate: "2021-07-01",
    popEndDate: "2022-07-01",
    clins: [
      {
        clinNumber: "9999",
        type: ClinType.CLOUD,
        classificationLevel: ClassificationLevel.UNCLASSIFIED,
        popStartDate: "2021-07-01",
        popEndDate: "2022-07-01",
      },
    ],
  },
];

export const administrators = [
  {
    email: "admin1@mail.mil",
    dodId: "1122334455",
    needsReset: false,
  },
  {
    email: "superAdmin@mail.mil",
    dodId: "1234567890",
    needsReset: false,
  },
];

export const cspAProvisioningBodyNoPayload = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: TEST_PORTFOLIO_ID,
  targetCspName: CSP_A,
};

export const cspAProvisioningBodyNoPayloadNoPortfolioId = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: "",
  targetCspName: CSP_A,
};

export const cspAAddPortfolioRequest = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.ADD_PORTFOLIO,
  payload: {
    name: "Sample Portfolio",
    taskOrders,
  },
};

export const cspAGetPortfolioRequest = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.GET_PORTFOLIO,
  payload: {},
};

export const cspAGetPortfolioRequestBadId = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: `${TEST_BAD_PORTFOLIO_ID}`,
  targetCspName: CSP_A,
  operationType: ProvisionRequestType.GET_PORTFOLIO,
  payload: {},
};

export const cspAAddEnvironmentRequest = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.ADD_ENVIRONMENT,
  payload: {
    name: "Sample Environment",
    administrators,
    classificationLevel: "UNCLASSIFIED",
    cloudDistinguisher: undefined,
  },
};

export const cspAAddEnvironmentRequestNewSchema = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.ADD_ENVIRONMENT,
  payload: {
    name: "Sample Environment",
    administrators,
    classificationLevel: "UNCLASSIFIED",
    cloudDistinguisher: undefined,
    accountName: "Test",
    emailDistributionList: "Test",
    isMigration: false,
  },
};

export const cspAAddEnvironmentRequestNewSchemaIsMigration = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.ADD_ENVIRONMENT,
  payload: {
    name: "Sample Environment",
    administrators,
    classificationLevel: "UNCLASSIFIED",
    cloudDistinguisher: undefined,
    accountName: "Test",
    emailDistributionList: "Test",
    isMigration: true,
  },
};

export const cspAUpdateTaskOrderRequest = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.UPDATE_TASK_ORDER,
  payload: {
    taskOrderId: TEST_TASKORDER_ID,
    taskOrder: taskOrders[0],
  },
};

export const cspAUpdateTaskOrderRequestNoPortfolioId = {
  ...cspAProvisioningBodyNoPayloadNoPortfolioId,
  operationType: ProvisionRequestType.UPDATE_TASK_ORDER,
  payload: {
    taskOrderId: TEST_TASKORDER_ID,
    taskOrder: taskOrders[0],
  },
};

export const cspAUpdateTaskOrderRequestNoTaskOrderId = {
  ...cspAProvisioningBodyNoPayload,
  operationType: ProvisionRequestType.UPDATE_TASK_ORDER,
  payload: {
    taskOrderId: "",
    taskOrder: taskOrders[0],
  },
};

export const requestContext = { identity: { sourceIp: "203.0.113.0" } };

export const validRequest = {
  body: JSON.stringify(cspAAddPortfolioRequest),
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
};

// cost fixtures
export const validCostRequest: CostRequest = {
  requestId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  portfolioId: TEST_PORTFOLIO_ID,
  targetCspName: CSP_A,
  startDate: "2022-01-01",
  endDate: "2022-12-01",
};

export const baseApiRequest = {
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
};

export const FAKE_COST_DATA: CostResponseByPortfolio = {
  taskOrders: [
    {
      taskOrderNumber: "1234567890123",
      clins: [
        {
          clinNumber: "0001",
          actual: [
            {
              total: "123.00",
              results: [
                { month: "2022-01", value: "1.00" },
                { month: "2022-02", value: "12.00" },
                { month: "2022-03", value: "110.00" },
              ],
            },
          ],
          forecast: [
            {
              total: "1350.00",
              results: [
                { month: "2022-04", value: "150.00" },
                { month: "2022-05", value: "150.00" },
                { month: "2022-06", value: "150.00" },
                { month: "2022-07", value: "150.00" },
                { month: "2022-08", value: "150.00" },
                { month: "2022-09", value: "150.00" },
                { month: "2022-10", value: "150.00" },
                { month: "2022-11", value: "150.00" },
                { month: "2022-12", value: "150.00" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function constructCspTarget(csp: string) {
  return {
    name: csp,
  };
}

export function generateTestSQSEvent(recordBodies: object[]): SQSEvent {
  const records = recordBodies.map((body) => {
    const recordBody = JSON.stringify(body);
    return {
      body: recordBody,
      messageId: "999",
      messageAttributes: {},
      receiptHandle: "",
      eventSource: "",
      eventSourceARN: "",
      awsRegion: "us-east-1",
      attributes: {
        ApproximateFirstReceiveTimestamp: "",
        ApproximateReceiveCount: "0",
        SentTimestamp: "",
        SenderId: "",
      },
      // The use of MD5 here is not for any cryptographic purpose. It is
      // to mock a field of a Lambda event. This is only used for the
      // purposes of a basic validation (much like CRC).
      md5OfBody: crypto.createHash("md5").update(recordBody).digest("hex"),
    };
  });
  return {
    Records: records,
  };
}
export function generateMockMessageResponses(messageBodies: object[]) {
  const messages = messageBodies.map((body) => {
    const messageBody = JSON.stringify(body);
    return {
      MessageId: "b5353c",
      ReceiptHandle: "AQC0e6b=",
      MD5OfBody: crypto.createHash("md5").update(messageBody).digest("hex"),
      Body: messageBody,
      Attributes: undefined,
      MD5OfMessageAttributes: undefined,
      MessageAttributes: undefined,
    };
  });

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: "74b3f95",
      extendedRequestId: undefined,
      cfId: undefined,
      attempts: 1,
      totalRetryDelay: 0,
    },
    Messages: messages,
  };
}

export function constructProvisionRequestForCsp(csp: string, request: HothProvisionRequest): HothProvisionRequest {
  const body = {
    ...request,
    targetCspName: csp,
  };
  return {
    ...body,
  };
}
