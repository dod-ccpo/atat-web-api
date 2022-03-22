/**
 * Sample lambda used as a placeholder prior to implementation of other lambdas
 *
 * @param stateInput - input to the state task that is processed
 */
export async function handler(stateInput: any): Promise<any> {
  console.log("STATE INPUT: " + JSON.stringify(stateInput));

  // A mock function that is used as a placeholder for each state and returns the input
  // and a status code.
  return { ...stateInput, statusCodeFn: 200 };
}