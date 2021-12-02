import { Context } from "aws-lambda";
import { ProvisioningTaskInputModel } from "../models/ProvisioningStatus";

/**
 * Mock lambda for provisioning requests submitted by user
 *
 * @param stateInput - input to the state task that is processed
 */
export async function handler(stateInput: ProvisioningTaskInputModel, context?: Context): Promise<unknown> {
  console.log("STATE INPUT: " + JSON.stringify(stateInput));

  // A mock function that is used as a placeholder for each state and returns the input.
  return stateInput;
}
