import { Context } from "aws-lambda";
import { ProvisioningTask } from "./consumePortfolioDraftSubmitQueue";

/**
 * Mock lambda for provisioning requests submitted by user
 *
 * @param stateInput - input to the state task that is processed by a lambda
 */
export async function handler(stateInput: ProvisioningTask, context?: Context): Promise<unknown> {
  console.log("STATE INPUT: " + JSON.stringify(stateInput));

  // this function is a mock function that is used for each state and returns the input and
  // and a hardcoded response status code to be used to get through the state machine.
  //  validation is being performed.
  return { ...stateInput, response: { statusCode: 200 } };
}
