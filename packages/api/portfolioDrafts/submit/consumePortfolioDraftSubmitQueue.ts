import { SQSEvent } from "aws-lambda";
import { sfnClient } from "../../utils/aws-sdk/stepFunctions";
import { CloudServiceProvider } from "../../models/CloudServiceProvider";
import { PortfolioDraft } from "../../models/PortfolioDraft";
import { ApplicationStep } from "../../models/ApplicationStep";
import { FundingStep } from "../../models/FundingStep";
import { Operators } from "../../models/Operator";

const SFN_ARN = process.env.SFN_ARN ?? "";

export enum ProvisioningRequestType {
  FULL_PORTFOLIO = "full_portfolio",
  PARTIAL_APPLICATION_STEP = "partial_applications",
  PARTIAL_ENVIRONMENT = "partial_environments",
  PARTIAL_FUNDING_STEP = "partial_task_order",
  PARTIAL_OPERATORS = "partial_operators",
}

export type ProvisioningBody = PortfolioDraft | ApplicationStep | FundingStep | Operators;
export interface ProvisioningTask {
  body: ProvisioningBody;
  type: ProvisioningRequestType;
  csp: CloudServiceProvider;
}
/**
 * Receives SQS Events and starts the State Machine Execution
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  const records = event.Records.map((record) => record.body);
  console.log("Number of Records: " + records.length);
  for (const record of records) {
    console.log("Sent Record: " + record);

    // this assumes that the type and csp will be sent with the message from the API request and will
    // be available to identify the request being made
    const provisioningRecord: ProvisioningTask = {
      type: ProvisioningRequestType.FULL_PORTFOLIO,
      csp: CloudServiceProvider.CSP_A,
      body: JSON.parse(record),
    };

    // const provision = new ProvisionJob<PortfolioDraft>(record)
    const result = await sfnClient.startExecution({
      input: JSON.stringify(provisioningRecord),
      stateMachineArn: SFN_ARN,
    });
    console.log("Response: " + JSON.stringify(result));
  }
}
