import { SQSEvent } from "aws-lambda";
import { sfnClient } from "../../utils/aws-sdk/stepFunctions";

const SFN_ARN = process.env.SFN_ARN ?? "";

/**
 * Receives SQS Events and starts the State Machine Execution
 *
 * @param event - The SQS Event, triggered when a message is sent to the queue
 */
export async function handler(event: SQSEvent): Promise<void> {
  const records = event.Records.map((record) => record.body);
  console.log("Number of Records: " + records.length);
  console.log("Sent Record: " + records[0]);
  const result = await sfnClient.startExecution({
    input: records[0],
    stateMachineArn: SFN_ARN,
  });
  console.log("Response: " + JSON.stringify(result));
}
