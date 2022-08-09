import { SQSEvent } from "aws-lambda";
import { Network } from "../../models/cloud-service-providers";
import { CostRequest } from "../../models/cost-jobs";
import { ProvisionRequestType } from "../../models/provisioning-jobs";
import * as crypto from "crypto";

// provisioning fixtures
export const fundingSources = [
  {
    taskOrderNumber: "1234567890123",
    clin: "9999",
    popStartDate: "2021-07-01",
    popEndDate: "2022-07-01",
  },
];

export const operators = [
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
export const cspA = {
  name: "CSP_A",
  uri: "https://cspa.example.com/api/atat",
  network: Network.NETWORK_1,
};

export function constructCspTarget(csp: string, network: Network) {
  return {
    name: csp,
    uri: `https://${csp.toLocaleLowerCase()}.example/com/api/atat`,
    network,
  };
}

export const provisioningBodyNoPayload = {
  jobId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  userId: "21d18790-bf3e-4529-a361-460ee6d16e0b",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  operationType: ProvisionRequestType.ADD_OPERATORS,
  targetCsp: cspA,
  cspInvocation: undefined,
  cspResponse: undefined,
};

export const provisioningBodyWithPayload = {
  ...provisioningBodyNoPayload,
  payload: {
    name: "Sample Portfolio",
    fundingSources,
    operators,
  },
};

export const requestContext = { identity: { sourceIp: "203.0.113.0" } };

export const validRequest = {
  body: JSON.stringify(provisioningBodyWithPayload),
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

// cost fixtures
export const validCostRequest: CostRequest = {
  requestId: "81b31a89-e3e5-46ee-acfe-75436bd14577",
  portfolioId: "b02e77d1-234d-4e3d-bc85-b57ca5a93952",
  targetCsp: cspA,
  startDate: "2022-01-01",
  endDate: "2022-12-01",
};

export const baseApiRequest = {
  headers: {
    "Content-Type": "application/json",
  },
  requestContext,
} as any;

export function generateTestSQSEvent(recordBodies: any[]): SQSEvent {
  const records = recordBodies.map((body) => {
    const recordBody = JSON.stringify(body);
    return {
      body: recordBody,
      messageId: "0",
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
export function generateMockMessageResponses(messageBodies: any[]) {
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
