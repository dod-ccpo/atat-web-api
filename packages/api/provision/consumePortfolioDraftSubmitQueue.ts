import { SQSEvent } from "aws-lambda";
import { sfnClient } from "../utils/aws-sdk/stepFunctions";

const SFN_ARN = process.env.SFN_ARN ?? "";

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

    const result = await sfnClient.startExecution({
      input: record,
      stateMachineArn: SFN_ARN,
    });
    console.log("Response: " + JSON.stringify(result));
  }
}
